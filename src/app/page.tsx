import { Suspense } from 'react';
import { getFacebookKPIs, getFacebookTopPosts } from '@/lib/facebook';
import { getInstagramKPIs, getInstagramTopPosts } from '@/lib/instagram';
import { getCurrentMonth, formatNumber, truncateText, formatDate } from '@/lib/utils';
import KPICard from '@/components/ui/KPICard';
import MonthSelector from '@/components/ui/MonthSelector';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { month?: string };
}

async function OverviewContent({ month }: { month: string }) {
  const [fbKPIs, igKPIs, fbTopPosts, igTopPosts] = await Promise.all([
    getFacebookKPIs(month),
    getInstagramKPIs(month),
    getFacebookTopPosts(month, 3),
    getInstagramTopPosts(month, 3),
  ]);

  const combinedInteractions = Number(fbKPIs.total_interactions) + Number(igKPIs.total_interactions);
  const combinedPosts = Number(fbKPIs.total_posts) + Number(igKPIs.total_posts);
  const combinedReach = (Number(fbKPIs.total_reach) || 0) + (Number(igKPIs.total_reach) || 0);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard title="Gesamt Posts" value={formatNumber(combinedPosts)} icon="📝" />
        <KPICard title="Gesamt Interaktionen" value={formatNumber(combinedInteractions)} icon="💬" highlight />
        <KPICard title="Gesamt Reichweite" value={formatNumber(combinedReach)} icon="👥" />
        <KPICard title="Ø Interaktionen/Post" value={formatNumber(combinedPosts > 0 ? combinedInteractions / combinedPosts : 0)} icon="📈" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#111] rounded-xl p-6 border border-[#222]">
          <h3 className="text-lg font-semibold text-white mb-4">📘 Facebook KPIs</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-gray-400">Posts:</span> <span className="text-white font-bold">{formatNumber(fbKPIs.total_posts)}</span></div>
            <div><span className="text-gray-400">Reactions:</span> <span className="text-white font-bold">{formatNumber(fbKPIs.total_reactions)}</span></div>
            <div><span className="text-gray-400">Comments:</span> <span className="text-white font-bold">{formatNumber(fbKPIs.total_comments)}</span></div>
            <div><span className="text-gray-400">Reichweite:</span> <span className="text-white font-bold">{formatNumber(fbKPIs.total_reach)}</span></div>
          </div>
        </div>

        <div className="bg-[#111] rounded-xl p-6 border border-[#222]">
          <h3 className="text-lg font-semibold text-white mb-4">📸 Instagram KPIs</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-gray-400">Posts:</span> <span className="text-white font-bold">{formatNumber(igKPIs.total_posts)}</span></div>
            <div><span className="text-gray-400">Likes:</span> <span className="text-white font-bold">{formatNumber(igKPIs.total_likes)}</span></div>
            <div><span className="text-gray-400">Comments:</span> <span className="text-white font-bold">{formatNumber(igKPIs.total_comments)}</span></div>
            <div><span className="text-gray-400">Saves:</span> <span className="text-white font-bold">{formatNumber(igKPIs.total_saves)}</span></div>
          </div>
        </div>
      </div>

      {/* API Limitations Info */}
      <div className="mt-8 bg-[#111] border border-[#c8ff00]/30 rounded-xl p-6">
        <h3 className="text-[#c8ff00] font-semibold mb-2">⚠️ Facebook API Einschränkungen</h3>
        <div className="text-gray-400 text-sm space-y-1">
          <p><strong>Shares:</strong> Nicht für alle Posts verfügbar, daher separat ausgewiesen und nicht in Interaktionen enthalten.</p>
          <p><strong>Saves:</strong> Nicht über die Graph API abrufbar und werden nicht angezeigt.</p>
          <p><strong>Organisch vs. Paid:</strong> Nur über Ads API verfügbar (nicht implementiert).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-[#111] rounded-xl p-6 border border-[#222]">
          <h3 className="text-lg font-semibold text-white mb-4">Top Facebook Posts</h3>
          {fbTopPosts.length === 0 ? (
            <p className="text-gray-500">Keine Posts in diesem Monat</p>
          ) : (
            <div className="space-y-4">
              {fbTopPosts.map((post) => (
                <div key={post.post_id} className="border-b border-[#222] pb-4 last:border-0">
                  <p className="text-gray-300 text-sm">{truncateText(post.message, 100)}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-blue-400">{formatNumber(post.reactions_total)} Reactions</span>
                    <span className="text-green-400">{formatNumber(post.comments_total)} Comments</span>
                    <span className="text-gray-500">{formatDate(post.created_time)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#111] rounded-xl p-6 border border-[#222]">
          <h3 className="text-lg font-semibold text-white mb-4">Top Instagram Posts</h3>
          {igTopPosts.length === 0 ? (
            <p className="text-gray-500">Keine Posts in diesem Monat</p>
          ) : (
            <div className="space-y-4">
              {igTopPosts.map((post) => (
                <div key={post.media_id} className="border-b border-[#222] pb-4 last:border-0">
                  <p className="text-gray-300 text-sm">{truncateText(post.caption, 100)}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-pink-400">{formatNumber(post.likes)} Likes</span>
                    <span className="text-green-400">{formatNumber(post.comments)} Comments</span>
                    <span className="text-gray-500">{formatDate(post.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default async function OverviewPage({ searchParams }: PageProps) {
  const month = searchParams.month || getCurrentMonth();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-gray-400 mt-1">Facebook & Instagram Performance Metriken</p>
        </div>
        <Suspense fallback={<div className="text-gray-500">Laden...</div>}>
          <MonthSelector currentMonth={month} />
        </Suspense>
      </div>
      <Suspense fallback={<div className="text-gray-500">Daten werden geladen...</div>}>
        <OverviewContent month={month} />
      </Suspense>
    </div>
  );
}
