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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard title="Posts" value={formatNumber(kpis.total_posts)} icon="📝" />
        <KPICard title="Reactions" value={formatNumber(kpis.total_reactions)} icon="👍" />
        <KPICard title="Comments" value={formatNumber(kpis.total_comments)} icon="💬" />
        <KPICard title="Reichweite" value={formatNumber(kpis.total_reach)} icon="👥" />
      </div>

      {/* Top Posts Grid with Images */}
      <h2 className="text-xl font-bold text-white mb-4">Top Posts</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {posts.slice(0, 6).map((post) => (
          <div key={post.post_id} className="bg-[#111] rounded-xl border border-[#222] overflow-hidden hover:border-[#c8ff00]/30 transition-colors">
            {/* Image */}
            <div className="relative h-40 bg-gray-800">
              {post.image_url ? (
                <Image
                  src={post.image_url}
                  alt="Post"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 text-4xl">
                  📘
                </div>
              )}
            </div>
            
            {/* Content */}
            <div className="p-4">
              <p className="text-gray-300 text-sm line-clamp-2 mb-3 min-h-[2.5rem]">
                {post.message || 'Kein Text'}
              </p>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex gap-3">
                  <span className="text-blue-400">👍 {formatNumber(post.reactions_total)}</span>
                  <span className="text-gray-400">💬 {formatNumber(post.comments_total)}</span>
                </div>
                <span className="text-gray-500">{formatDate(post.created_time)}</span>
              </div>
              
              {post.permalink && (
                <a 
                  href={post.permalink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-3 block text-center text-xs text-[#c8ff00] hover:underline"
                >
                  Post ansehen →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Full Table */}
      <h2 className="text-xl font-bold text-white mb-4">Alle Posts</h2>
      <div className="bg-[#111] rounded-xl border border-[#222] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0a0a0a]">
            <tr>
              <th className="px-4 py-3 text-left text-gray-400 text-sm">Post</th>
              <th className="px-4 py-3 text-right text-gray-400 text-sm">Reactions</th>
              <th className="px-4 py-3 text-right text-gray-400 text-sm">Comments</th>
              <th className="px-4 py-3 text-right text-gray-400 text-sm">Shares</th>
              <th className="px-4 py-3 text-right text-gray-400 text-sm">Reach</th>
              <th className="px-4 py-3 text-right text-gray-400 text-sm">Datum</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.post_id} className="border-t border-[#222] hover:bg-[#0a0a0a]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {post.image_url && (
                      <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                        <Image
                          src={post.image_url}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                      {truncateText(post.message, 50)}
                    </a>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-white">{formatNumber(post.reactions_total)}</td>
                <td className="px-4 py-3 text-right text-white">{formatNumber(post.comments_total)}</td>
                <td className="px-4 py-3 text-right text-gray-500">{post.shares_total ? formatNumber(post.shares_total) : <span title="Limited">-</span>}</td>
                <td className="px-4 py-3 text-right text-white">{formatNumber(post.reach)}</td>
                <td className="px-4 py-3 text-right text-gray-400">{formatDate(post.created_time)}</td>
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
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">📘 Facebook Analytics</h1>
        <Suspense fallback={<div className="text-gray-500">Laden...</div>}>
          <MonthSelector currentMonth={month} />
        </Suspense>
      </div>
      <Suspense fallback={<div className="text-gray-500">Daten werden geladen...</div>}>
        <FacebookContent month={month} sort={sort} />
      </Suspense>
    </div>
  );
}
