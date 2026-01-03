import { Suspense } from 'react';
export const dynamic = 'force-dynamic';
import { getFacebookKPIs, getFacebookPosts } from '@/lib/facebook';
import { getCurrentMonth, formatNumber, truncateText, formatDate } from '@/lib/utils';
import KPICard from '@/components/ui/KPICard';
import MonthSelector from '@/components/ui/MonthSelector';

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

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
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
              <tr key={post.post_id} className="border-t border-gray-700 hover:bg-gray-750">
                <td className="px-4 py-3">
                  <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    {truncateText(post.message, 60)}
                  </a>
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
