import { Suspense } from 'react';
export const dynamic = 'force-dynamic';
import { getInstagramKPIs, getInstagramPosts } from '@/lib/instagram';
import { getCurrentMonth, formatNumber, truncateText, formatDate } from '@/lib/utils';
import MonthSelector from '@/components/ui/MonthSelector';

interface PageProps {
  searchParams: { month?: string; sort?: string };
}

async function InstagramContent({ month, sort }: { month: string; sort: string }) {
  const [kpis, posts] = await Promise.all([
    getInstagramKPIs(month),
    getInstagramPosts(month, sort, 50),
  ]);

  return (
    <>
      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="kpi-card border-l-4 border-l-[#E4405F]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm font-medium">Posts</span>
            <span className="text-2xl opacity-70">📝</span>
          </div>
          <div className="text-4xl font-bold text-white tracking-tight">{formatNumber(kpis.total_posts)}</div>
        </div>
        <div className="kpi-card border-l-4 border-l-[#E4405F]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm font-medium">Likes</span>
            <span className="text-2xl opacity-70">❤️</span>
          </div>
          <div className="text-4xl font-bold text-[#E4405F] tracking-tight">{formatNumber(kpis.total_likes)}</div>
        </div>
        <div className="kpi-card border-l-4 border-l-[#E4405F]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm font-medium">Comments</span>
            <span className="text-2xl opacity-70">💬</span>
          </div>
          <div className="text-4xl font-bold text-white tracking-tight">{formatNumber(kpis.total_comments)}</div>
        </div>
        <div className="kpi-card border-l-4 border-l-[#E4405F]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm font-medium">Saves</span>
            <span className="text-2xl opacity-70">🔖</span>
          </div>
          <div className="text-4xl font-bold text-white tracking-tight">{formatNumber(kpis.total_saves) || '-'}</div>
        </div>
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm font-medium">Reichweite</span>
            <span className="text-2xl opacity-70">👥</span>
          </div>
          <div className="text-4xl font-bold text-white tracking-tight">{formatNumber(kpis.total_reach) || '-'}</div>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm font-medium">Video Plays</span>
            <span className="text-2xl opacity-70">▶️</span>
          </div>
          <div className="text-4xl font-bold text-white tracking-tight">{formatNumber(kpis.total_plays) || '-'}</div>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm font-medium">Ø Reichweite/Post</span>
            <span className="text-2xl opacity-70">📊</span>
          </div>
          <div className="text-4xl font-bold text-white tracking-tight">{formatNumber(kpis.avg_reach_per_post) || '-'}</div>
        </div>
        <div className="kpi-card bg-gradient-to-br from-[#84CC16]/20 to-[#84CC16]/5 border-[#84CC16]/30">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm font-medium">Ø Interaktionen/Post</span>
            <span className="text-2xl opacity-70">📈</span>
          </div>
          <div className="text-4xl font-bold gradient-text tracking-tight">{formatNumber(kpis.avg_interactions_per_post)}</div>
        </div>
      </div>

      {/* Posts Table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E4405F]/20 flex items-center justify-center">
              <span className="text-xl">📋</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Alle Posts</h2>
              <p className="text-sm text-gray-500">Vollständige Übersicht aller Instagram Posts</p>
            </div>
          </div>
        </div>
        
        <table className="w-full">
          <thead className="bg-[#1A1A1A]">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Post</th>
              <th className="px-4 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Typ</th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Likes</th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Comments</th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Saves</th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Reach</th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Plays</th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Datum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
            {posts.map((post) => (
              <tr key={post.media_id} className="hover:bg-[#1A1A1A] transition-colors">
                <td className="px-6 py-4">
                  <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="text-[#E4405F] hover:text-[#E4405F]/80 transition-colors">
                    {truncateText(post.caption, 50)}
                  </a>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    post.media_type === 'VIDEO' || post.media_type === 'REELS' 
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' 
                      : post.media_type === 'CAROUSEL_ALBUM'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/20'
                  }`}>
                    {post.media_type === 'VIDEO' ? '🎬 Video' : 
                     post.media_type === 'REELS' ? '🎬 Reel' :
                     post.media_type === 'CAROUSEL_ALBUM' ? '📷 Carousel' : 
                     '📷 Image'}
                  </span>
                </td>
                <td className="px-4 py-4 text-right text-white font-medium">{formatNumber(post.likes)}</td>
                <td className="px-4 py-4 text-right text-white">{formatNumber(post.comments)}</td>
                <td className="px-4 py-4 text-right text-white">{formatNumber(post.saves) || '-'}</td>
                <td className="px-4 py-4 text-right text-white">{formatNumber(post.reach) || '-'}</td>
                <td className="px-4 py-4 text-right text-white">{formatNumber(post.plays) || '-'}</td>
                <td className="px-4 py-4 text-right text-gray-400 text-sm">{formatDate(post.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default async function InstagramPage({ searchParams }: PageProps) {
  const month = searchParams.month || getCurrentMonth();
  const sort = searchParams.sort || 'interactions';

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#E4405F]/20 flex items-center justify-center text-xl">📸</span>
            Instagram Analytics
          </h1>
          <p className="text-gray-500 mt-1">Performance Metriken und Post-Übersicht</p>
        </div>
        <Suspense fallback={<div className="text-gray-500">Laden...</div>}>
          <MonthSelector currentMonth={month} />
        </Suspense>
      </div>
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#E4405F] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Daten werden geladen...</p>
          </div>
        </div>
      }>
        <InstagramContent month={month} sort={sort} />
      </Suspense>
    </div>
  );
}
