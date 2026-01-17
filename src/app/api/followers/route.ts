import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const customer = searchParams.get('customer');
  const months = parseInt(searchParams.get('months') || '12');

  try {
    // Get customer accounts if customer is specified
    let fbPageIds: string[] = [];
    let igAccountIds: string[] = [];

    if (customer && customer !== 'all') {
      const accounts = await query<{ platform: string; account_id: string }>(
        `SELECT platform, account_id FROM customer_accounts ca
         JOIN customers c ON ca.customer_id = c.customer_id
         WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER($1)`,
        [customer]
      );
      fbPageIds = accounts.filter(a => a.platform === 'facebook').map(a => a.account_id);
      igAccountIds = accounts.filter(a => a.platform === 'instagram').map(a => a.account_id);
    }

    // Get current follower counts (latest snapshot for each account)
    const fbCurrentQuery = `
      SELECT DISTINCT ON (fh.page_id)
        fh.page_id as account_id,
        'facebook' as platform,
        COALESCE(p.name, fh.page_id) as account_name,
        fh.followers_count,
        fh.snapshot_date
      FROM fb_follower_history fh
      LEFT JOIN fb_pages p ON fh.page_id = p.page_id
      ${fbPageIds.length > 0 ? `WHERE fh.page_id = ANY($1)` : ''}
      ORDER BY fh.page_id, fh.snapshot_date DESC
    `;
    const fbCurrent = await query<{
      account_id: string;
      platform: string;
      account_name: string;
      followers_count: number;
      snapshot_date: string;
    }>(fbCurrentQuery, fbPageIds.length > 0 ? [fbPageIds] : []);

    const igCurrentQuery = `
      SELECT DISTINCT ON (ih.account_id)
        ih.account_id,
        'instagram' as platform,
        COALESCE(a.username, a.name, ih.account_id) as account_name,
        ih.followers_count,
        ih.snapshot_date
      FROM ig_follower_history ih
      LEFT JOIN ig_accounts a ON ih.account_id = a.account_id
      ${igAccountIds.length > 0 ? `WHERE ih.account_id = ANY($1)` : ''}
      ORDER BY ih.account_id, ih.snapshot_date DESC
    `;
    const igCurrent = await query<{
      account_id: string;
      platform: string;
      account_name: string;
      followers_count: number;
      snapshot_date: string;
    }>(igCurrentQuery, igAccountIds.length > 0 ? [igAccountIds] : []);

    // Calculate totals
    const fbTotal = fbCurrent.reduce((sum, row) => sum + Number(row.followers_count), 0);
    const igTotal = igCurrent.reduce((sum, row) => sum + Number(row.followers_count), 0);

    // Facebook monthly follower growth (for historical comparison)
    const fbGrowthQuery = `
      WITH monthly_snapshots AS (
        SELECT 
          page_id,
          DATE_TRUNC('month', snapshot_date) as month,
          followers_count,
          ROW_NUMBER() OVER (PARTITION BY page_id, DATE_TRUNC('month', snapshot_date) ORDER BY snapshot_date DESC) as rn
        FROM fb_follower_history
        WHERE snapshot_date >= NOW() - INTERVAL '${months} months'
        ${fbPageIds.length > 0 ? `AND page_id = ANY($1)` : ''}
      ),
      monthly_data AS (
        SELECT 
          page_id,
          month,
          followers_count as end_followers,
          LAG(followers_count) OVER (PARTITION BY page_id ORDER BY month) as start_followers
        FROM monthly_snapshots
        WHERE rn = 1
      )
      SELECT 
        TO_CHAR(month, 'YYYY-MM') as month,
        'facebook' as platform,
        md.page_id as account_id,
        COALESCE(p.name, md.page_id) as account_name,
        COALESCE(start_followers, end_followers) as start_followers,
        end_followers,
        end_followers - COALESCE(start_followers, end_followers) as net_change,
        CASE 
          WHEN COALESCE(start_followers, 0) > 0 
          THEN ROUND(((end_followers - start_followers)::numeric / start_followers) * 100, 2)
          ELSE 0 
        END as percent_change
      FROM monthly_data md
      LEFT JOIN fb_pages p ON md.page_id = p.page_id
      ORDER BY month DESC, account_name
    `;
    const fbGrowth = await query<{
      month: string;
      platform: string;
      account_id: string;
      account_name: string;
      start_followers: string;
      end_followers: string;
      net_change: string;
      percent_change: string;
    }>(fbGrowthQuery, fbPageIds.length > 0 ? [fbPageIds] : []);

    // Instagram monthly follower growth
    const igGrowthQuery = `
      WITH monthly_snapshots AS (
        SELECT 
          account_id,
          DATE_TRUNC('month', snapshot_date) as month,
          followers_count,
          ROW_NUMBER() OVER (PARTITION BY account_id, DATE_TRUNC('month', snapshot_date) ORDER BY snapshot_date DESC) as rn
        FROM ig_follower_history
        WHERE snapshot_date >= NOW() - INTERVAL '${months} months'
        ${igAccountIds.length > 0 ? `AND account_id = ANY($1)` : ''}
      ),
      monthly_data AS (
        SELECT 
          account_id,
          month,
          followers_count as end_followers,
          LAG(followers_count) OVER (PARTITION BY account_id ORDER BY month) as start_followers
        FROM monthly_snapshots
        WHERE rn = 1
      )
      SELECT 
        TO_CHAR(month, 'YYYY-MM') as month,
        'instagram' as platform,
        md.account_id,
        COALESCE(a.username, a.name, md.account_id) as account_name,
        COALESCE(start_followers, end_followers) as start_followers,
        end_followers,
        end_followers - COALESCE(start_followers, end_followers) as net_change,
        CASE 
          WHEN COALESCE(start_followers, 0) > 0 
          THEN ROUND(((end_followers - start_followers)::numeric / start_followers) * 100, 2)
          ELSE 0 
        END as percent_change
      FROM monthly_data md
      LEFT JOIN ig_accounts a ON md.account_id = a.account_id
      ORDER BY month DESC, account_name
    `;
    const igGrowth = await query<{
      month: string;
      platform: string;
      account_id: string;
      account_name: string;
      start_followers: string;
      end_followers: string;
      net_change: string;
      percent_change: string;
    }>(igGrowthQuery, igAccountIds.length > 0 ? [igAccountIds] : []);

    // Combine and aggregate by month
    const allGrowth = [...fbGrowth, ...igGrowth];
    
    // Group by month for summary
    const monthlyTotals = new Map<string, { fb: number; ig: number; total: number }>();
    
    for (const row of allGrowth) {
      const existing = monthlyTotals.get(row.month) || { fb: 0, ig: 0, total: 0 };
      const netChange = parseInt(row.net_change);
      if (row.platform === 'facebook') {
        existing.fb += netChange;
      } else {
        existing.ig += netChange;
      }
      existing.total += netChange;
      monthlyTotals.set(row.month, existing);
    }

    const summary = Array.from(monthlyTotals.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month));

    return NextResponse.json({
      // Current follower totals
      currentTotals: {
        facebook: fbTotal,
        instagram: igTotal,
        total: fbTotal + igTotal
      },
      // Current follower details by account
      currentDetails: [...fbCurrent, ...igCurrent].map(row => ({
        ...row,
        followers_count: Number(row.followers_count)
      })),
      // Monthly growth summary (for chart)
      summary,
      // Monthly growth details
      details: allGrowth.map(row => ({
        ...row,
        start_followers: parseInt(row.start_followers),
        end_followers: parseInt(row.end_followers),
        net_change: parseInt(row.net_change),
        percent_change: parseFloat(row.percent_change),
      })),
    });
  } catch (error) {
    console.error('Error fetching follower growth:', error);
    return NextResponse.json({ error: 'Failed to fetch follower growth' }, { status: 500 });
  }
}
