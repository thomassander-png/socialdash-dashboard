'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import { ExternalLink } from 'lucide-react';

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
  likes?: number;
  saves?: number;
}

interface PostsTableProps {
  posts: Post[];
  platform: 'facebook' | 'instagram';
}

type SortKey = 'reactions' | 'comments' | 'reach' | 'interactions' | 'engagement';
type SortDir = 'asc' | 'desc';

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString('de-DE');
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatPercent(num: number): string {
  return num.toFixed(2) + '%';
}

// Memoized table row component to prevent unnecessary re-renders
const PostRow = memo(function PostRow({ 
  post, 
  platform, 
  accentColor 
}: { 
  post: Post & { interactions: number; engagementRate: number }; 
  platform: 'facebook' | 'instagram';
  accentColor: string;
}) {
  return (
    <tr className="border-b border-[#262626]/50 hover:bg-[#1a1a1a] transition-colors">
      <td className="py-3 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded overflow-hidden bg-[#262626] flex-shrink-0">
            {post.thumbnail_url ? (
              <img 
                src={post.thumbnail_url} 
                alt="Post"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                {platform === 'facebook' ? '📘' : '📸'}
              </div>
            )}
          </div>
          <div className="min-w-0 max-w-[200px]">
            <p className="text-white text-sm truncate">
              {post.message || 'Kein Text'}
            </p>
            <p className="text-gray-500 text-xs">{formatDate(post.created_time)}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-2">
        <span className="bg-[#262626] text-gray-300 text-xs px-2 py-1 rounded">
          {post.type || 'post'}
        </span>
      </td>
      <td className="py-3 px-2 text-right text-white">
        {formatNumber(post.reactions_total || post.likes || 0)}
      </td>
      <td className="py-3 px-2 text-right text-white">
        {formatNumber(post.comments_total || 0)}
      </td>
      {platform === 'facebook' && (
        <td className="py-3 px-2 text-right text-gray-500">
          {post.shares_total != null ? formatNumber(post.shares_total) : '-'}
        </td>
      )}
      {platform === 'instagram' && (
        <td className="py-3 px-2 text-right text-gray-500">
          {post.saves != null ? formatNumber(post.saves) : '-'}
        </td>
      )}
      <td className="py-3 px-2 text-right text-white">
        {post.reach != null ? formatNumber(post.reach) : '-'}
      </td>
      <td className={`py-3 px-2 text-right font-bold ${accentColor}`}>
        {formatNumber(post.interactions)}
      </td>
      <td className="py-3 px-2 text-right">
        <span className={`font-medium ${post.engagementRate >= 5 ? 'text-green-400' : post.engagementRate >= 2 ? 'text-yellow-400' : 'text-gray-400'}`}>
          {post.reach ? formatPercent(post.engagementRate) : '-'}
        </span>
      </td>
      <td className="py-3 px-2 text-center">
        {post.permalink && (
          <a 
            href={post.permalink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-white transition-colors"
          >
            <ExternalLink size={16} />
          </a>
        )}
      </td>
    </tr>
  );
});

// Memoized sort button to prevent re-renders
const SortButton = memo(function SortButton({ 
  label, 
  keyName, 
  sortKey, 
  onSort 
}: { 
  label: string; 
  keyName: SortKey; 
  sortKey: SortKey;
  onSort: (key: SortKey) => void;
}) {
  const handleClick = useCallback(() => {
    // Use requestAnimationFrame to defer state update and prevent INP issues
    requestAnimationFrame(() => {
      onSort(keyName);
    });
  }, [keyName, onSort]);

  return (
    <button 
      onClick={handleClick}
      className={`flex items-center gap-1 text-xs uppercase tracking-wider ${
        sortKey === keyName ? 'text-[#84cc16]' : 'text-gray-500'
      } hover:text-white transition-colors`}
    >
      {label}
      <span className="text-[10px]">▲▼</span>
    </button>
  );
});

export default function PostsTable({ posts, platform }: PostsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('interactions');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [visibleCount, setVisibleCount] = useState(20); // Initial visible posts
  
  const accentColor = platform === 'facebook' ? 'text-blue-400' : 'text-pink-400';
  
  // Memoized sort handler
  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prevKey => {
      if (prevKey === key) {
        setSortDir(prevDir => prevDir === 'asc' ? 'desc' : 'asc');
        return key;
      }
      setSortDir('desc');
      return key;
    });
  }, []);
  
  // Memoize processed posts to avoid recalculation on every render
  const processedPosts = useMemo(() => {
    return posts.map(p => {
      const interactions = (p.reactions_total || p.likes || 0) + (p.comments_total || 0);
      const reach = p.reach || 0;
      const engagementRate = reach > 0 ? (interactions / reach) * 100 : 0;
      return {
        ...p,
        interactions,
        engagementRate
      };
    });
  }, [posts]);
  
  // Memoize sorted posts
  const sortedPosts = useMemo(() => {
    return [...processedPosts].sort((a, b) => {
      let aVal = 0, bVal = 0;
      switch (sortKey) {
        case 'reactions':
          aVal = a.reactions_total || a.likes || 0;
          bVal = b.reactions_total || b.likes || 0;
          break;
        case 'comments':
          aVal = a.comments_total || 0;
          bVal = b.comments_total || 0;
          break;
        case 'reach':
          aVal = a.reach || 0;
          bVal = b.reach || 0;
          break;
        case 'interactions':
          aVal = a.interactions;
          bVal = b.interactions;
          break;
        case 'engagement':
          aVal = a.engagementRate;
          bVal = b.engagementRate;
          break;
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [processedPosts, sortKey, sortDir]);
  
  // Visible posts with lazy loading
  const visiblePosts = useMemo(() => {
    return sortedPosts.slice(0, visibleCount);
  }, [sortedPosts, visibleCount]);
  
  // Load more handler
  const handleLoadMore = useCallback(() => {
    requestAnimationFrame(() => {
      setVisibleCount(prev => Math.min(prev + 20, sortedPosts.length));
    });
  }, [sortedPosts.length]);
  
  const hasMore = visibleCount < sortedPosts.length;
  
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 overflow-hidden">
      <div className="mb-4">
        <h3 className="text-white font-bold text-lg">
          Alle {platform === 'facebook' ? 'Facebook' : 'Instagram'} Posts
        </h3>
        <p className="text-gray-500 text-sm">Vollständige Übersicht mit Sortierung ({sortedPosts.length} Posts)</p>
      </div>
      
      {posts.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          Keine Posts verfügbar
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#262626]">
                  <th className="text-left py-3 px-2 text-gray-500 text-xs uppercase tracking-wider">Beitrag</th>
                  <th className="text-left py-3 px-2 text-gray-500 text-xs uppercase tracking-wider">Typ</th>
                  <th className="text-right py-3 px-2">
                    <SortButton label={platform === 'facebook' ? 'Reactions' : 'Likes'} keyName="reactions" sortKey={sortKey} onSort={handleSort} />
                  </th>
                  <th className="text-right py-3 px-2">
                    <SortButton label="Comments" keyName="comments" sortKey={sortKey} onSort={handleSort} />
                  </th>
                  {platform === 'facebook' && (
                    <th className="text-right py-3 px-2 text-gray-500 text-xs uppercase tracking-wider">Shares</th>
                  )}
                  {platform === 'instagram' && (
                    <th className="text-right py-3 px-2 text-gray-500 text-xs uppercase tracking-wider">Saves</th>
                  )}
                  <th className="text-right py-3 px-2">
                    <SortButton label="Reichweite" keyName="reach" sortKey={sortKey} onSort={handleSort} />
                  </th>
                  <th className="text-right py-3 px-2">
                    <SortButton label="Interaktionen" keyName="interactions" sortKey={sortKey} onSort={handleSort} />
                  </th>
                  <th className="text-right py-3 px-2">
                    <SortButton label="Eng.-Rate" keyName="engagement" sortKey={sortKey} onSort={handleSort} />
                  </th>
                  <th className="text-center py-3 px-2 text-gray-500 text-xs uppercase tracking-wider">Link</th>
                </tr>
              </thead>
              <tbody>
                {visiblePosts.map((post) => (
                  <PostRow 
                    key={post.post_id} 
                    post={post} 
                    platform={platform} 
                    accentColor={accentColor} 
                  />
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Load More Button */}
          {hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={handleLoadMore}
                className="bg-[#262626] hover:bg-[#333] text-white px-6 py-2 rounded-lg transition-colors"
              >
                Mehr laden ({sortedPosts.length - visibleCount} weitere)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
