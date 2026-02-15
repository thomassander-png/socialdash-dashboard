import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.FACEBOOK_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

  try {
    const client = await pool.connect();
    try {
      // Read from cache
      const result = await client.query(
        'SELECT data, synced_at FROM ads_cache WHERE month = $1',
        [month]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        return NextResponse.json({
          ...row.data,
          synced_at: row.synced_at,
          cached: true,
        }, {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
          }
        });
      }

      // No cached data available
      return NextResponse.json({
        month,
        adAccounts: [],
        accountSummaries: [],
        campaigns: [],
        totals: {
          totalSpend: 0,
          totalImpressions: 0,
          totalReach: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalLeads: 0,
          avgCPC: 0,
          avgCPM: 0,
          avgCTR: 0,
        },
        cached: false,
        needsSync: true,
        message: 'Keine gecachten Daten vorhanden. Bitte klicke auf "Sync" um die Daten von Meta zu laden.',
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Ads API Error:', error);
    // If table doesn't exist yet, return needsSync
    if (error.message?.includes('does not exist')) {
      return NextResponse.json({
        month,
        adAccounts: [],
        accountSummaries: [],
        campaigns: [],
        totals: {
          totalSpend: 0,
          totalImpressions: 0,
          totalReach: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalLeads: 0,
          avgCPC: 0,
          avgCPM: 0,
          avgCTR: 0,
        },
        cached: false,
        needsSync: true,
        message: 'Ads-Cache noch nicht initialisiert. Bitte klicke auf "Sync".',
      });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ads data' },
      { status: 500 }
    );
  }
}
