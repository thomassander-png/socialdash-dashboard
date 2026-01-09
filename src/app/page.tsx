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
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard title="Gesamt Posts" value={formatNumber(combinedPosts)} icon="📝" />
        <KPICard title="Gesamt Interaktionen" value={formatNumber(combinedInteractions)} icon="💬" highlight />
        <KPICard title="Gesamt Reichweite" value={formatNumber(combinedReach)} icon="👥" />
        <KPICard title="Ø Interaktionen/Post" value={formatNumber(combinedPosts > 0 ? Math.round(combinedInteractions / combinedPosts) : 0)} icon="📈" />
      </div>

      {/* Platform KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Facebook KPIs */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#1877F2]/20 flex items-center justify-center">
              <span className="text-xl">📘</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Facebook</h3>
              <p className="text-sm text-gray-500">Performance Metriken</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)]">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Posts</p>
              <p className="text-2xl font-bold text-white">{formatNumber(fbKPIs.total_posts)}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)]">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Reactions</p>
              <p className="text-2xl font-bold text-[#1877F2]">{formatNumber(fbKPIs.total_reactions)}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)]">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Comments</p>
              <p className="text-2xl font-bold text-white">{formatNumber(fbKPIs.total_comments)}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)]">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Reichweite</p>
              <p className="text-2xl font-bold text-white">{formatNumber(fbKPIs.total_reach) || '-'}</p>
            </div>
          </div>
        </div>

        {/* Instagram KPIs */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#E4405F]/20 flex items-center justify-center">
              <span className="text-xl">📸</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Instagram</h3>
              <p className="text-sm text-gray-500">Performance Metriken</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)]">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Posts</p>
              <p className="text-2xl font-bold text-white">{formatNumber(igKPIs.total_posts)}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)]">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Likes</p>
              <p className="text-2xl font-bold text-[#E4405F]">{formatNumber(igKPIs.total_likes)}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)]">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Comments</p>
              <p className="text-2xl font-bold text-white">{formatNumber(igKPIs.total_comments)}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)]">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Saves</p>
              <p className="text-2xl font-bold text-white">{formatNumber(igKPIs.total_saves) || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* API Limitations Info */}
      <div className="card p-6 mb-8 border-l-4 border-l-[#84CC16]">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="text-[#84CC16] font-semibold mb-3">Facebook API Einschränkungen</h3>
            <div className="text-gray-400 text-sm space-y-2">
              <p><span className="text-white font-medium">Shares:</span> Nicht für alle Posts verfügbar, daher separat ausgewiesen und nicht in Interaktionen enthalten.</p>
              <p><span className="text-white font-medium">Saves:</span> Nicht über die Graph API abrufbar und werden nicht angezeigt.</p>
              <p><span className="text-white font-medium">Organisch vs. Paid:</span> Nur über Ads API verfügbar (nicht implementiert).</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Posts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Facebook Posts */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#1877F2]/20 flex items-center justify-center text-sm">📘</span>
            Top Facebook Posts
          </h3>
          {fbTopPosts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Keine Posts in diesem Monat</p>
          ) : (
            <div className="space-y-4">
              {fbTopPosts.map((post, index) => (
                <div key={post.post_id} className="p-4 rounded-xl bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)] transition-all">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl font-bold text-[#1877F2]/30">#{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-300 text-sm leading-relaxed">{truncateText(post.message, 100)}</p>
                      <div className="flex flex-wrap gap-3 mt-3 text-xs">
                        <span className="px-2 py-1 rounded-full bg-[#1877F2]/10 text-[#1877F2]">{formatNumber(post.reactions_total)} Reactions</span>
                        <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400">{formatNumber(post.comments_total)} Comments</span>
                        <span className="text-gray-500">{formatDate(post.created_time)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Instagram Posts */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#E4405F]/20 flex items-center justify-center text-sm">📸</span>
            Top Instagram Posts
          </h3>
          {igTopPosts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Keine Posts in diesem Monat</p>
          ) : (
            <div className="space-y-4">
              {igTopPosts.map((post, index) => (
                <div key={post.media_id} className="p-4 rounded-xl bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)] transition-all">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl font-bold text-[#E4405F]/30">#{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-300 text-sm leading-relaxed">{truncateText(post.caption, 100)}</p>
                      <div className="flex flex-wrap gap-3 mt-3 text-xs">
                        <span className="px-2 py-1 rounded-full bg-[#E4405F]/10 text-[#E4405F]">{formatNumber(post.likes)} Likes</span>
                        <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400">{formatNumber(post.comments)} Comments</span>
                        <span className="text-gray-500">{formatDate(post.timestamp)}</span>
                      </div>
                    </div>
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
          <p className="text-gray-500 mt-1">Facebook & Instagram Performance Metriken</p>
        </div>
        <Suspense fallback={<div className="text-gray-500">Laden...</div>}>
          <MonthSelector currentMonth={month} />
        </Suspense>
      </div>
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#84CC16] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Daten werden geladen...</p>
          </div>
        </div>
      }>
        <OverviewContent month={month} />
      </Suspense>
    </div>
  );
}
