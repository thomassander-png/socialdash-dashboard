import { Suspense } from 'react';
export const dynamic = 'force-dynamic';
import { getFacebookPosts } from '@/lib/facebook';
import { getInstagramPosts } from '@/lib/instagram';
import { getCurrentMonth, formatNumber, formatDate } from '@/lib/utils';
import MonthSelector from '@/components/ui/MonthSelector';
import Image from 'next/image';

interface PageProps {
  searchParams: { month?: string; platform?: string };
}

async function PostsContent({ month, platform }: { month: string; platform: string }) {
  const [fbPosts, igPosts] = await Promise.all([
    platform !== 'instagram' ? getFacebookPosts(month, 'date', 100) : Promise.resolve([]),
    platform !== 'instagram' ? getInstagramPosts(month, 'date', 100) : Promise.resolve([]),
  ]);

  const allPosts = [
    ...fbPosts.map(p => ({ 
      ...p, 
      platform: 'facebook' as const, 
      date: new Date(p.created_time), 
      text: p.message, 
      interactions: p.interactions,
      image_url: p.image_url 
    })),
    ...igPosts.map(p => ({ 
      ...p, 
      platform: 'instagram' as const, 
      date: new Date(p.timestamp), 
      text: p.caption, 
      interactions: p.interactions,
      image_url: p.image_url 
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-4">
      {allPosts.map((post, idx) => (
        <div key={idx} className="bg-[#111] rounded-xl border border-[#222] p-4 hover:border-[#333] transition-colors">
          <div className="flex gap-4">
            {/* Thumbnail */}
            <div className="flex-shrink-0">
              {post.image_url ? (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-800">
                  <Image
                    src={post.image_url}
                    alt="Post thumbnail"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500">
                  {post.platform === 'facebook' ? '📘' : '📸'}
                </div>
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  post.platform === 'facebook' 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-400'
                }`}>
                  {post.platform === 'facebook' ? '📘 Facebook' : '📸 Instagram'}
                </span>
                <span className="text-gray-500 text-sm">{formatDate(post.date)}</span>
              </div>
              
              <p className="text-gray-300 text-sm line-clamp-2">
                {post.text || 'Kein Text'}
              </p>
            </div>
            
            {/* Stats */}
            <div className="flex-shrink-0 text-right">
              <div className="text-[#c8ff00] font-bold text-lg">
                {formatNumber(post.interactions)}
              </div>
              <div className="text-gray-500 text-xs">Interaktionen</div>
            </div>
          </div>
        </div>
      ))}
      
      {allPosts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Keine Posts für diesen Monat gefunden.
        </div>
      )}
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
