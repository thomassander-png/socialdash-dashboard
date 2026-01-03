import { Suspense } from 'react';
export const dynamic = 'force-dynamic';
import { getFacebookPosts } from '@/lib/facebook';
import { getInstagramPosts } from '@/lib/instagram';
import { getCurrentMonth, formatNumber, truncateText, formatDate } from '@/lib/utils';
import MonthSelector from '@/components/ui/MonthSelector';

interface PageProps {
  searchParams: { month?: string; platform?: string };
}

async function PostsContent({ month, platform }: { month: string; platform: string }) {
  const [fbPosts, igPosts] = await Promise.all([
    platform !== 'instagram' ? getFacebookPosts(month, 'date', 100) : Promise.resolve([]),
    platform !== 'facebook' ? getInstagramPosts(month, 'date', 100) : Promise.resolve([]),
  ]);

  const allPosts = [
    ...fbPosts.map(p => ({ ...p, platform: 'facebook' as const, date: new Date(p.created_time), text: p.message, interactions: p.interactions })),
    ...igPosts.map(p => ({ ...p, platform: 'instagram' as const, date: new Date(p.timestamp), text: p.caption, interactions: p.interactions })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-900">
          <tr>
            <th className="px-4 py-3 text-left text-gray-400 text-sm">Platform</th>
            <th className="px-4 py-3 text-left text-gray-400 text-sm">Post</th>
            <th className="px-4 py-3 text-right text-gray-400 text-sm">Interaktionen</th>
            <th className="px-4 py-3 text-right text-gray-400 text-sm">Datum</th>
          </tr>
        </thead>
        <tbody>
          {allPosts.map((post, idx) => (
            <tr key={idx} className="border-t border-gray-700 hover:bg-gray-750">
              <td className="px-4 py-3">
                <span className={post.platform === 'facebook' ? 'text-blue-400' : 'text-pink-400'}>
                  {post.platform === 'facebook' ? '📘 Facebook' : '📸 Instagram'}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-300">{truncateText(post.text, 80)}</td>
              <td className="px-4 py-3 text-right text-white">{formatNumber(post.interactions)}</td>
              <td className="px-4 py-3 text-right text-gray-400">{formatDate(post.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PostsPage({ searchParams }: PageProps) {
  const month = searchParams.month || getCurrentMonth();
  const platform = searchParams.platform || 'all';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">📝 Alle Posts</h1>
        <Suspense fallback={<div className="text-gray-500">Laden...</div>}>
          <MonthSelector currentMonth={month} />
        </Suspense>
      </div>
      <Suspense fallback={<div className="text-gray-500">Daten werden geladen...</div>}>
        <PostsContent month={month} platform={platform} />
      </Suspense>
    </div>
  );
}
