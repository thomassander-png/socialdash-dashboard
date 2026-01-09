import { Suspense } from 'react';
export const dynamic = 'force-dynamic';
import { getFacebookKPIs, getFacebookPosts } from '@/lib/facebook';
import { getCurrentMonth, formatNumber, truncateText, formatDate } from '@/lib/utils';
import KPICard from '@/components/ui/KPICard';
import MonthSelector from '@/components/ui/MonthSelector';
import Image from 'next/image';

interface PageProps {
  searchParams: { month?: string; sort?: string };
}

async function FacebookContent({ month, sort }: { month: string; sort: string }) {
  const [kpis, posts] = await Promise.all([
    getFacebookKPIs(month),
    getFacebookPosts(month, sort, 50),
  ]);

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="kpi-card border-l-4 border-l-[#1877F2]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm font-medium">Posts</span>
            <span className="text-2xl opacity-70">📝</span>
          </div>
          <div className="text-4xl font-bold text-white tracking-tight">{formatNumber(kpis.total_posts)}</div>
        </div>
        <div className="kpi-card border-l-4 border-l-[#1877F2]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm font-medium">Reactions</span>
            <span className="text-2xl opacity-70">👍</span>
          </div>
          <div className="text-4xl font-bold text-[#1877F2] tracking-tight">{formatNumber(kpis.total_reactions)}</div>
        </div>
        <div className="kpi-card border-l-4 border-l-[#1877F2]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm font-medium">Comments</span>
            <span className="text-2xl opacity-70">💬</span>
          </div>
          <div className="text-4xl font-bold text-white tracking-tight">{formatNumber(kpis.total_comments)}</div>
        </div>
        <div className="kpi-card border-l-4 border-l-[#1877F2]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm font-medium">Reichweite</span>
            <span className="text-2xl opacity-70">👥</span>
          </div>
          <div className="text-4xl font-bold text-white tracking-tight">{formatNumber(kpis.total_reach) || '-'}</div>
        </div>
      </div>

      {/* Top Posts Grid with Images */}
      <div className="card p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#1877F2]/20 flex items-center justify-center">
            <span className="text-xl">🏆</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Top Posts</h2>
            <p className="text-sm text-gray-500">Die besten Posts nach Interaktionen</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.slice(0, 6).map((post, index) => (
            <div key={post.post_id} className="bg-[#0D0D0D] rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden hover:border-[#1877F2]/30 transition-all group">
              {/* Rank Badge */}
              <div className="relative">
                <div className="absolute top-3 left-3 z-10 w-8 h-8 rounded-lg bg-[#1877F2] flex items-center justify-center font-bold text-white text-sm shadow-lg">
                  #{index + 1}
                </div>
                
                {/* Image */}
                <div className="relative h-44 bg-[#1A1A1A]">
                  {post.image_url ? (
                    <Image
                      src={post.image_url}
                      alt="Post"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-5xl">
                      📘
                    </div>
                  )}
                </div>
              </div>
              
              {/* Content */}
              <div className="p-4">
                <p className="text-gray-300 text-sm line-clamp-2 mb-4 min-h-[2.5rem] leading-relaxed">
                  {post.message || 'Kein Text'}
                </p>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex gap-2">
                    <span className="px-2 py-1 rounded-full bg-[#1877F2]/10 text-[#1877F2] text-xs">👍 {formatNumber(post.reactions_total)}</span>
                    <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-xs">💬 {formatNumber(post.comments_total)}</span>
                  </div>
                  <span className="text-gray-500 text-xs">{formatDate(post.created_time)}</span>
                </div>
                
                {post.permalink && (
                  <a 
                    href={post.permalink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-4 block text-center text-xs text-[#1877F2] hover:text-[#1877F2]/80 transition-colors font-medium"
                  >
                    Post ansehen →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1877F2]/20 flex items-center justify-center">
              <span className="text-xl">📋</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Alle Posts</h2>
              <p className="text-sm text-gray-500">Vollständige Übersicht aller Facebook Posts</p>
            </div>
          </div>
        </div>
        
        <table className="w-full">
          <thead className="bg-[#1A1A1A]">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Post</th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Reactions</th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Comments</th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Shares</th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Reach</th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Datum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
            {posts.map((post) => (
              <tr key={post.post_id} className="hover:bg-[#1A1A1A] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {post.image_url && (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-[rgba(255,255,255,0.06)]">
                        <Image
                          src={post.image_url}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="text-[#1877F2] hover:text-[#1877F2]/80 transition-colors">
                      {truncateText(post.message, 50)}
                    </a>
                  </div>
                </td>
                <td className="px-4 py-4 text-right text-white font-medium">{formatNumber(post.reactions_total)}</td>
                <td className="px-4 py-4 text-right text-white">{formatNumber(post.comments_total)}</td>
                <td className="px-4 py-4 text-right text-gray-500">{post.shares_total ? formatNumber(post.shares_total) : <span title="Limited" className="text-gray-600">-</span>}</td>
                <td className="px-4 py-4 text-right text-white">{formatNumber(post.reach) || '-'}</td>
                <td className="px-4 py-4 text-right text-gray-400 text-sm">{formatDate(post.created_time)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default async function FacebookPage({ searchParams }: PageProps) {
  const month = searchParams.month || getCurrentMonth();
  const sort = searchParams.sort || 'interactions';

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#1877F2]/20 flex items-center justify-center text-xl">📘</span>
            Facebook Analytics
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
            <div className="w-12 h-12 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Daten werden geladen...</p>
          </div>
        </div>
      }>
        <FacebookContent month={month} sort={sort} />
      </Suspense>
    </div>
  );
}
