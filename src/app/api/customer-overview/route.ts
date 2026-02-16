import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.FACEBOOK_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Mapping of ad account names/IDs to customer slugs
// This maps Meta Ads account names to the customer slugs in our DB
const AD_ACCOUNT_CUSTOMER_MAP: Record<string, string> = {
  // By account_id
  '64446085': 'andskincare', // Kosmetikvertrieb H.Renner GmbH
  '289778171212746': 'contipark', // Contipark Parkgaragengesellschaft mbH
  '1908114009405295': 'captrain-deutschland', // Captrain (famefact)
  '589986474813245': 'pelikan', // Hamelin / Oxford (Pelikan group)
  '456263405094069': 'famefact-gmbh', // WeWatch Security Service GmbH
  '969976773634901': 'asphericon', // asphericon
  '594963889574701': 'pelikan', // Pelikan Deutschland (contains both Pelikan & Herlitz campaigns)
  '1812018146005238': 'fensterart', // FENSTERART
  '778746264991304': 'vergleich.org', // VGL Publishing AG Paid Ads
};

// Shared ad accounts: Some accounts contain campaigns for multiple customers.
// Campaigns matching these patterns (case-insensitive) are reassigned to a different customer.
const CAMPAIGN_CUSTOMER_OVERRIDES: { pattern: RegExp; targetSlug: string }[] = [
  { pattern: /herlitz/i, targetSlug: 'herlitz' },
];

/** Determine the customer slug for a campaign, considering campaign-level overrides */
function getCampaignCustomerSlug(campaign: any): string | null {
  // Check campaign name against overrides first
  for (const override of CAMPAIGN_CUSTOMER_OVERRIDES) {
    if (override.pattern.test(campaign.name)) {
      return override.targetSlug;
    }
  }
  // Fall back to account-level mapping
  return AD_ACCOUNT_CUSTOMER_MAP[campaign.account_id] || null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
  const customerSlug = searchParams.get('customer'); // optional: filter single customer

  const startDate = `${month}-01`;
  const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 1).toISOString().slice(0, 10);
  const prevMonthDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() - 1, 1);
  const prevStartDate = prevMonthDate.toISOString().slice(0, 10);
  const prevEndDate = startDate;

  // End of current month for follower snapshot
  const monthEnd = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0).toISOString().slice(0, 10);
  // End of previous month for follower snapshot
  const prevMonthEnd = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth(), 0).toISOString().slice(0, 10);

  try {
    const client = await pool.connect();
    try {
      // 1. Get all customers with their accounts
      let customerQuery = `
        SELECT c.customer_id, c.name, LOWER(REPLACE(c.name, ' ', '-')) as slug,
               json_agg(json_build_object('platform', ca.platform, 'account_id', ca.account_id)) as accounts
        FROM customers c
        JOIN customer_accounts ca ON c.customer_id = ca.customer_id
        WHERE c.is_active = true
      `;
      const customerParams: any[] = [];
      if (customerSlug) {
        customerQuery += ` AND LOWER(REPLACE(c.name, ' ', '-')) = $1`;
        customerParams.push(customerSlug);
      }
      customerQuery += ` GROUP BY c.customer_id, c.name ORDER BY c.name`;

      const customersResult = await client.query(customerQuery, customerParams);
      const customers = customersResult.rows;

      // 2. Get ads cache data for this month
      const adsResult = await client.query(
        'SELECT data FROM ads_cache WHERE month = $1',
        [month]
      );
      const adsData = adsResult.rows[0]?.data || { accountSummaries: [], campaigns: [] };

      // 3. Build customer overview
      const customerOverviews = await Promise.all(customers.map(async (customer: any) => {
        const fbPageIds = customer.accounts
          .filter((a: any) => a.platform === 'facebook')
          .map((a: any) => a.account_id);
        const igAccountIds = customer.accounts
          .filter((a: any) => a.platform === 'instagram')
          .map((a: any) => a.account_id);

        // FB Stats - Current Month
        let fbStats = { posts: 0, reactions: 0, comments: 0, shares: 0, reach: 0, impressions: 0, video_views: 0 };
        let fbPrevStats = { posts: 0, reactions: 0, comments: 0, shares: 0, reach: 0, impressions: 0, video_views: 0 };
        let fbFollowers = 0;
        let fbPrevFollowers = 0;

        if (fbPageIds.length > 0) {
          const [fbCurrent, fbPrev, fbFoll, fbPrevFoll] = await Promise.all([
            client.query(`
              SELECT COUNT(DISTINCT p.post_id) as posts,
                     COALESCE(SUM(m.reactions_total), 0) as reactions,
                     COALESCE(SUM(m.comments_total), 0) as comments,
                     COALESCE(SUM(m.shares_total), 0) as shares,
                     COALESCE(SUM(m.reach), 0) as reach,
                     COALESCE(SUM(m.impressions), 0) as impressions,
                     COALESCE(SUM(m.video_3s_views), 0) as video_views
              FROM fb_posts p
              LEFT JOIN LATERAL (
                SELECT * FROM fb_post_metrics WHERE post_id = p.post_id ORDER BY snapshot_time DESC LIMIT 1
              ) m ON true
              WHERE p.created_time::date >= $1::date AND p.created_time::date < $2::date
                AND p.page_id = ANY($3::text[])
            `, [startDate, endDate, fbPageIds]),
            client.query(`
              SELECT COUNT(DISTINCT p.post_id) as posts,
                     COALESCE(SUM(m.reactions_total), 0) as reactions,
                     COALESCE(SUM(m.comments_total), 0) as comments,
                     COALESCE(SUM(m.shares_total), 0) as shares,
                     COALESCE(SUM(m.reach), 0) as reach,
                     COALESCE(SUM(m.impressions), 0) as impressions,
                     COALESCE(SUM(m.video_3s_views), 0) as video_views
              FROM fb_posts p
              LEFT JOIN LATERAL (
                SELECT * FROM fb_post_metrics WHERE post_id = p.post_id ORDER BY snapshot_time DESC LIMIT 1
              ) m ON true
              WHERE p.created_time::date >= $1::date AND p.created_time::date < $2::date
                AND p.page_id = ANY($3::text[])
            `, [prevStartDate, prevEndDate, fbPageIds]),
            // FB Followers at end of current month
            client.query(`
              SELECT COALESCE(SUM(followers_count), 0) as followers
              FROM (
                SELECT DISTINCT ON (page_id) page_id, followers_count
                FROM fb_follower_history
                WHERE page_id = ANY($1::text[]) AND snapshot_date <= $2::date
                ORDER BY page_id, snapshot_date DESC
              ) latest
            `, [fbPageIds, monthEnd]),
            // FB Followers at end of previous month
            client.query(`
              SELECT COALESCE(SUM(followers_count), 0) as followers
              FROM (
                SELECT DISTINCT ON (page_id) page_id, followers_count
                FROM fb_follower_history
                WHERE page_id = ANY($1::text[]) AND snapshot_date <= $2::date
                ORDER BY page_id, snapshot_date DESC
              ) latest
            `, [fbPageIds, prevMonthEnd]),
          ]);

          fbStats = fbCurrent.rows[0] || fbStats;
          fbPrevStats = fbPrev.rows[0] || fbPrevStats;
          fbFollowers = parseInt(fbFoll.rows[0]?.followers || '0');
          fbPrevFollowers = parseInt(fbPrevFoll.rows[0]?.followers || '0');
        }

        // IG Stats - Current Month
        let igStats = { posts: 0, likes: 0, comments: 0, saves: 0, shares: 0, reach: 0, impressions: 0, plays: 0 };
        let igPrevStats = { posts: 0, likes: 0, comments: 0, saves: 0, shares: 0, reach: 0, impressions: 0, plays: 0 };
        let igFollowers = 0;
        let igPrevFollowers = 0;

        if (igAccountIds.length > 0) {
          const [igCurrent, igPrev, igFoll, igPrevFoll] = await Promise.all([
            client.query(`
              SELECT COUNT(DISTINCT p.media_id) as posts,
                     COALESCE(SUM(m.likes), 0) as likes,
                     COALESCE(SUM(m.comments), 0) as comments,
                     COALESCE(SUM(m.saves), 0) as saves,
                     COALESCE(SUM(m.shares), 0) as shares,
                     COALESCE(SUM(m.reach), 0) as reach,
                     COALESCE(SUM(m.impressions), 0) as impressions,
                     COALESCE(SUM(m.plays), 0) as plays
              FROM ig_posts p
              LEFT JOIN LATERAL (
                SELECT * FROM ig_post_metrics WHERE media_id = p.media_id ORDER BY snapshot_time DESC LIMIT 1
              ) m ON true
              WHERE p.timestamp::date >= $1::date AND p.timestamp::date < $2::date
                AND p.account_id = ANY($3::text[])
            `, [startDate, endDate, igAccountIds]),
            client.query(`
              SELECT COUNT(DISTINCT p.media_id) as posts,
                     COALESCE(SUM(m.likes), 0) as likes,
                     COALESCE(SUM(m.comments), 0) as comments,
                     COALESCE(SUM(m.saves), 0) as saves,
                     COALESCE(SUM(m.shares), 0) as shares,
                     COALESCE(SUM(m.reach), 0) as reach,
                     COALESCE(SUM(m.impressions), 0) as impressions,
                     COALESCE(SUM(m.plays), 0) as plays
              FROM ig_posts p
              LEFT JOIN LATERAL (
                SELECT * FROM ig_post_metrics WHERE media_id = p.media_id ORDER BY snapshot_time DESC LIMIT 1
              ) m ON true
              WHERE p.timestamp::date >= $1::date AND p.timestamp::date < $2::date
                AND p.account_id = ANY($3::text[])
            `, [prevStartDate, prevEndDate, igAccountIds]),
            // IG Followers at end of current month
            client.query(`
              SELECT COALESCE(SUM(followers_count), 0) as followers
              FROM (
                SELECT DISTINCT ON (account_id) account_id, followers_count
                FROM ig_follower_history
                WHERE account_id = ANY($1::text[]) AND snapshot_date <= $2::date
                ORDER BY account_id, snapshot_date DESC
              ) latest
            `, [igAccountIds, monthEnd]),
            // IG Followers at end of previous month
            client.query(`
              SELECT COALESCE(SUM(followers_count), 0) as followers
              FROM (
                SELECT DISTINCT ON (account_id) account_id, followers_count
                FROM ig_follower_history
                WHERE account_id = ANY($1::text[]) AND snapshot_date <= $2::date
                ORDER BY account_id, snapshot_date DESC
              ) latest
            `, [igAccountIds, prevMonthEnd]),
          ]);

          igStats = igCurrent.rows[0] || igStats;
          igPrevStats = igPrev.rows[0] || igPrevStats;
          igFollowers = parseInt(igFoll.rows[0]?.followers || '0');
          igPrevFollowers = parseInt(igPrevFoll.rows[0]?.followers || '0');
        }

        // Ads data for this customer - use campaign-level mapping for accurate attribution
        const customerCampaigns = (adsData.campaigns || []).filter((c: any) => {
          return getCampaignCustomerSlug(c) === customer.slug;
        });

        // Calculate totals from individual campaigns (not account summaries)
        // This ensures correct attribution when accounts are shared between customers
        const adSpend = customerCampaigns.reduce((sum: number, c: any) => sum + (c.insight?.spend || 0), 0);
        const adImpressions = customerCampaigns.reduce((sum: number, c: any) => sum + (c.insight?.impressions || 0), 0);
        const adClicks = customerCampaigns.reduce((sum: number, c: any) => sum + (c.insight?.clicks || 0), 0);
        const adReach = customerCampaigns.reduce((sum: number, c: any) => sum + (c.insight?.reach || 0), 0);

        // Follower netto calculation
        const fbFollowerNetto = fbFollowers - fbPrevFollowers;
        const igFollowerNetto = igFollowers - igPrevFollowers;
        const hasFbPrevData = fbPrevFollowers > 0;
        const hasIgPrevData = igPrevFollowers > 0;

        return {
          customer_id: customer.customer_id,
          name: customer.name,
          slug: customer.slug,
          // Facebook
          fb: {
            followers: fbFollowers,
            prevFollowers: fbPrevFollowers,
            followerNetto: fbFollowerNetto,
            hasPrevData: hasFbPrevData,
            posts: parseInt(fbStats.posts as any) || 0,
            reactions: parseInt(fbStats.reactions as any) || 0,
            comments: parseInt(fbStats.comments as any) || 0,
            shares: parseInt(fbStats.shares as any) || 0,
            reach: parseInt(fbStats.reach as any) || 0,
            impressions: parseInt(fbStats.impressions as any) || 0,
            videoViews: parseInt(fbStats.video_views as any) || 0,
            prevPosts: parseInt(fbPrevStats.posts as any) || 0,
            prevReach: parseInt(fbPrevStats.reach as any) || 0,
            prevImpressions: parseInt(fbPrevStats.impressions as any) || 0,
          },
          // Instagram
          ig: {
            followers: igFollowers,
            prevFollowers: igPrevFollowers,
            followerNetto: igFollowerNetto,
            hasPrevData: hasIgPrevData,
            posts: parseInt(igStats.posts as any) || 0,
            likes: parseInt(igStats.likes as any) || 0,
            comments: parseInt(igStats.comments as any) || 0,
            saves: parseInt(igStats.saves as any) || 0,
            shares: parseInt(igStats.shares as any) || 0,
            reach: parseInt(igStats.reach as any) || 0,
            impressions: parseInt(igStats.impressions as any) || 0,
            plays: parseInt(igStats.plays as any) || 0,
            prevPosts: parseInt(igPrevStats.posts as any) || 0,
            prevReach: parseInt(igPrevStats.reach as any) || 0,
            prevImpressions: parseInt(igPrevStats.impressions as any) || 0,
          },
          // Ads
          ads: {
            spend: adSpend,
            impressions: adImpressions,
            clicks: adClicks,
            reach: adReach,
            cpc: adClicks > 0 ? adSpend / adClicks : 0,
            ctr: adImpressions > 0 ? (adClicks / adImpressions) * 100 : 0,
            cpm: adImpressions > 0 ? (adSpend / adImpressions) * 1000 : 0,
            campaigns: customerCampaigns.length,
          },
          // Totals
          totals: {
            followers: fbFollowers + igFollowers,
            prevFollowers: fbPrevFollowers + igPrevFollowers,
            followerNetto: fbFollowerNetto + igFollowerNetto,
            posts: (parseInt(fbStats.posts as any) || 0) + (parseInt(igStats.posts as any) || 0),
            reach: (parseInt(fbStats.reach as any) || 0) + (parseInt(igStats.reach as any) || 0),
            impressions: (parseInt(fbStats.impressions as any) || 0) + (parseInt(igStats.impressions as any) || 0),
            interactions: (parseInt(fbStats.reactions as any) || 0) + (parseInt(fbStats.comments as any) || 0) +
                          (parseInt(igStats.likes as any) || 0) + (parseInt(igStats.comments as any) || 0),
            adSpend: adSpend,
          }
        };
      }));

      return NextResponse.json({
        month,
        customers: customerOverviews,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Customer Overview API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
