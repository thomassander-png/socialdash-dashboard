import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
  const forceSync = searchParams.get('sync') === 'true';

  try {
    // Ensure table exists
    await query(`
      CREATE TABLE IF NOT EXISTS ads_cache (
        id SERIAL PRIMARY KEY,
        month VARCHAR(7) NOT NULL,
        data JSONB NOT NULL,
        synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(month)
      )
    `);

    // Read from cache
    const cached = await queryOne<{ data: any; synced_at: string }>(
      'SELECT data, synced_at FROM ads_cache WHERE month = $1',
      [month]
    );

    if (cached) {
      return NextResponse.json({
        ...cached.data,
        synced_at: cached.synced_at,
        cached: true,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
      });
    }

    // If no cache and forceSync requested, trigger sync inline
    if (forceSync) {
      const syncUrl = new URL('/api/ads/sync', request.url);
      syncUrl.searchParams.set('month', month);
      syncUrl.searchParams.set('manual', 'true');
      
      try {
        const syncResponse = await fetch(syncUrl.toString(), {
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (syncResponse.ok) {
          // Re-read from cache
          const freshCached = await queryOne<{ data: any; synced_at: string }>(
            'SELECT data, synced_at FROM ads_cache WHERE month = $1',
            [month]
          );
          if (freshCached) {
            return NextResponse.json({
              ...freshCached.data,
              synced_at: freshCached.synced_at,
              cached: false,
            });
          }
        }
      } catch (e) {
        console.error('Inline sync failed:', e);
      }
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
      message: 'Keine gecachten Daten vorhanden. Bitte klicke auf "Daten synchronisieren" um die Daten von Meta zu laden.',
    });
  } catch (error: any) {
    console.error('Ads API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ads data' },
      { status: 500 }
    );
  }
}
