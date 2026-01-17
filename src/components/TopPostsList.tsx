'use client';

import { useMemo, memo } from 'react';

interface Post {
  post_id: string;
  message: string;
  type: string;
  created_time: string;
  permalink: string;
  thumbnail_url?: string;
  reactions_total: number;
  comments_total: number;
  shares_total?: number;
  reach?: number;
  impressions?: number;
}

interface TopPostsListProps {
  posts: Post[];
  platform: 'facebook' | 'instagram';
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString('de-DE');
}

// Memoized post item component
const PostItem = memo(function PostItem({
  post,
  index,
  accentColor,
  bgAccent,
  platform
}: {
  post: Post & { interactions: number };
  index: number;
  accentColor: string;
  bgAccent: string;
  platform: 'facebook' | 'instagram';
}) {
  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg ${bgAccent} border border-[#262626]`}
    >
      {/* Rank */}
      <div className={`text-lg font-bold ${accentColor} w-8`}>
        #{index + 1}
      </div>
      
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded overflow-hidden bg-[#262626] flex-shrink-0">
        {post.thumbnail_url ? (
          <img 
            src={post.thumbnail_url} 
            alt={`Post ${index + 1}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-lg">
            {platform === 'facebook' ? '📘' : '📸'}
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm truncate">
          {post.message || 'Kein Text'}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-yellow-500 text-xs flex items-center gap-1">
            👍 {formatNumber(post.reactions_total)}
          </span>
          <span className="text-gray-400 text-xs flex items-center gap-1">
            💬 {post.comments_total}
          </span>
        </div>
      </div>
      
      {/* Total interactions */}
      <div className={`text-xl font-bold ${accentColor}`}>
        {formatNumber(post.interactions)}
      </div>
    </div>
  );
});

export default function TopPostsList({ posts, platform }: TopPostsListProps) {
  const accentColor = platform === 'facebook' ? 'text-blue-400' : 'text-pink-400';
  const bgAccent = platform === 'facebook' ? 'bg-blue-500/10' : 'bg-pink-500/10';
  
  // Memoize top posts calculation
  const topPosts = useMemo(() => {
    return posts
      .map(p => ({
        ...p,
        interactions: p.reactions_total + p.comments_total
      }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 5);
  }, [posts]);
  
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🏆</span>
        <div>
          <h3 className="text-white font-bold text-lg">Top Posts</h3>
          <p className="text-gray-500 text-sm">Die besten Posts nach Interaktionen</p>
        </div>
      </div>
      
      {topPosts.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          Keine Posts verfügbar
        </div>
      ) : (
        <div className="space-y-3">
          {topPosts.map((post, index) => (
            <PostItem
              key={post.post_id}
              post={post}
              index={index}
              accentColor={accentColor}
              bgAccent={bgAccent}
              platform={platform}
            />
          ))}
        </div>
      )}
    </div>
  );
}
