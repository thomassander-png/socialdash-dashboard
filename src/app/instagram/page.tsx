import { Suspense } from 'react';
export const dynamic = 'force-dynamic';
import { getInstagramKPIs, getInstagramPosts } from '@/lib/instagram';
import { getCurrentMonth, formatNumber, truncateText, formatDate } from '@/lib/utils';
import KPICard from '@/components/ui/KPICard';
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard title="Posts" value={formatNumber(kpis.total_posts)} icon="📝" />
        <KPICard title="Likes" value={formatNumber(kpis.total_likes)} icon="❤️" />
        <KPICard title="Comments" value={formatNumber(kpis.total_comments)} icon="💬" />
        <KPICard title="Saves" value={formatNumber(kpis.total_saves)} icon="🔖" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard title="Reichweite" value={formatNumber(kpis.total_reach)} icon="👥" />
        <KPICard title="Video Plays" value={formatNumber(kpis.total_plays)} icon="▶️" />
        <KPICard title="Ø Reichweite/Post" value={formatNumber(kpis.avg_reach_per_post)} icon="📊" />
        <KPICard title="Ø Interaktionen/Post" value={formatNumber(kpis.avg_interactions_per_post)} icon="📈" />
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-gray-400 text-sm">Post</th>
              <th className="px-4 py-3 text-center text-gray-400 text-sm">Typ</th>
              <th className="px-4 py-3 text-right text-gray-400 text-sm">Likes</th>
              <th className="px-4 py-3 text-right text-gray-400 text-sm">Comments</th>
              <th className="px-4 py-3 text-right text-gray-400 text-sm">Saves</th>
              <th className="px-4 py-3 text-right text-gray-400 text-sm">Reach</th>
              <th className="px-4 py-3 text-right text-gray-400 text-sm">Plays</th>
              <th className="px-4 py-3 text-right text-gray-400 text-sm">Datum</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.media_id} className="border-t border-gray-700 hover:bg-gray-750">
                <td className="px-4 py-3">
                  <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">
                    {truncateText(post.caption, 50)}
                  </a>
                </td>
                <td className="px-4 py-3 text-center text-gray-400 text-xs">{post.media_type}</td>
                <td className="px-4 py-3 text-right text-white">{formatNumber(post.likes)}</td>
                <td className="px-4 py-3 text-right text-white">{formatNumber(post.comments)}</td>
                <td className="px-4 py-3 text-right text-white">{formatNumber(post.saves)}</td>
                <td className="px-4 py-3 text-right text-white">{formatNumber(post.reach)}</td>
                <td className="px-4 py-3 text-right text-white">{formatNumber(post.plays)}</td>
                <td className="px-4 py-3 text-right text-gray-400">{formatDate(post.timestamp)}</td>
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
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">📸 Instagram Analytics</h1>
        <Suspense fallback={<div className="text-gray-500">Laden...</div>}>
          <MonthSelector currentMonth={month} />
        </Suspense>
      </div>
      <Suspense fallback={<div className="text-gray-500">Daten werden geladen...</div>}>
        <InstagramContent month={month} sort={sort} />
      </Suspense>
    </div>
  );
}
