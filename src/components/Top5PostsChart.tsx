'use client';

import { useState } from 'react';

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

interface Top5PostsChartProps {
  posts: Post[];
  platform: 'facebook' | 'instagram';
  totalPosts: number;
}

type SortOption = 'interactions' | 'engagement' | 'reach';

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString('de-DE');
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function formatPercent(num: number): string {
  return num.toFixed(2) + '%';
}

export default function Top5PostsChart({ posts, platform, totalPosts }: Top5PostsChartProps) {
  const [sortBy, setSortBy] = useState<SortOption>('interactions');
  
  const barColor = platform === 'facebook' ? 'bg-blue-500' : 'bg-pink-500';
  const title = platform === 'facebook' ? 'Top 5 Facebook Posts' : 'Top 5 Instagram Posts';
  
  // Calculate metrics for all posts
  const postsWithMetrics = posts.map(p => {
    const interactions = (p.reactions_total || p.likes || 0) + (p.comments_total || 0);
    const reach = p.reach || 0;
    const engagementRate = reach > 0 ? (interactions / reach) * 100 : 0;
    return {
      ...p,
      interactions,
      engagementRate
    };
  });
  
  // Sort based on selected option
  const topPosts = [...postsWithMetrics]
    .sort((a, b) => {
      switch (sortBy) {
        case 'interactions':
          return b.interactions - a.interactions;
        case 'engagement':
          return b.engagementRate - a.engagementRate;
        case 'reach':
          return (b.reach || 0) - (a.reach || 0);
        default:
          return b.interactions - a.interactions;
      }
    })
    .slice(0, 5);
  
  // Get max value for bar scaling
  const getMaxValue = () => {
    if (topPosts.length === 0) return 1;
    switch (sortBy) {
      case 'interactions':
        return topPosts[0].interactions;
      case 'engagement':
        return topPosts[0].engagementRate;
      case 'reach':
        return topPosts[0].reach || 1;
      default:
        return topPosts[0].interactions;
    }
  };
  
  const maxValue = getMaxValue();
  
  // Get display value for a post
  const getDisplayValue = (post: typeof topPosts[0]) => {
    switch (sortBy) {
      case 'interactions':
        return formatNumber(post.interactions);
      case 'engagement':
        return formatPercent(post.engagementRate);
      case 'reach':
        return formatNumber(post.reach || 0);
      default:
        return formatNumber(post.interactions);
    }
  };
  
  // Get bar height percentage
  const getBarHeight = (post: typeof topPosts[0]) => {
    let value = 0;
    switch (sortBy) {
      case 'interactions':
        value = post.interactions;
        break;
      case 'engagement':
        value = post.engagementRate;
        break;
      case 'reach':
        value = post.reach || 0;
        break;
    }
    return Math.max((value / maxValue) * 100 * 0.6, 15);
  };
  
  const sortLabels: Record<SortOption, string> = {
    interactions: 'Interaktionen',
    engagement: 'Engagement-Rate',
    reach: 'Reichweite'
  };
  
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-bold text-lg">{title}</h3>
          <p className="text-gray-500 text-sm">Nach {sortLabels[sortBy]} sortiert</p>
        </div>
      </div>
      
      {/* Sort Options */}
      <div className="flex gap-2 mb-6">
        {(['interactions', 'engagement', 'reach'] as SortOption[]).map((option) => (
          <button
            key={option}
            onClick={() => setSortBy(option)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              sortBy === option 
                ? 'bg-[#84cc16] text-black font-bold' 
                : 'bg-[#262626] text-gray-400 hover:bg-[#363636]'
            }`}
          >
            {sortLabels[option]}
          </button>
        ))}
      </div>
      
      {topPosts.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          Keine Posts verfügbar
        </div>
      ) : (
        <div className="flex items-end justify-between gap-4 h-80">
          {topPosts.map((post, index) => {
            const barHeight = getBarHeight(post);
            
            return (
              <div key={post.post_id} className="flex-1 flex flex-col items-center h-full justify-end">
                {/* Value above image */}
                <span className="text-white text-sm font-bold mb-2">
                  {getDisplayValue(post)}
                </span>
                
                {/* Post image - positioned above the bar */}
                <div className="w-14 h-14 mb-1 rounded-lg overflow-hidden bg-[#262626] flex-shrink-0 border border-[#363636]">
                  {post.thumbnail_url ? (
                    <img 
                      src={post.thumbnail_url} 
                      alt={`Post ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl">
                      {platform === 'facebook' ? '📘' : '📸'}
                    </div>
                  )}
                </div>
                
                {/* Bar */}
                <div 
                  className={`w-full ${barColor} rounded-t transition-all duration-500`}
                  style={{ height: `${barHeight}%` }}
                ></div>
                
                {/* Post label and date */}
                <div className="mt-2 text-center">
                  <span className="text-gray-400 text-xs block">Post {index + 1}</span>
                  <span className="text-gray-500 text-xs block">{formatDate(post.created_time)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
