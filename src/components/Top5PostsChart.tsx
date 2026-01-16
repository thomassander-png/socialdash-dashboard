'use client';

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

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString('de-DE');
}

export default function Top5PostsChart({ posts, platform, totalPosts }: Top5PostsChartProps) {
  const barColor = platform === 'facebook' ? 'bg-blue-500' : 'bg-pink-500';
  const title = platform === 'facebook' ? 'Top 5 Posts nach Interaktionen' : 'Top 5 Posts nach Interaktionen';
  const subtitle = 'Mit Post-Vorschaubildern';
  
  // Get top 5 posts sorted by interactions
  const topPosts = posts
    .map(p => ({
      ...p,
      interactions: (p.reactions_total || p.likes || 0) + (p.comments_total || 0)
    }))
    .sort((a, b) => b.interactions - a.interactions)
    .slice(0, 5);
  
  const maxInteractions = topPosts.length > 0 ? topPosts[0].interactions : 1;
  
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white font-bold text-lg">{title}</h3>
          <p className="text-gray-500 text-sm">{subtitle}</p>
        </div>
        <span className="bg-[#84cc16] text-black text-xs font-bold px-2 py-1 rounded">
          {totalPosts}
        </span>
      </div>
      
      {topPosts.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          Keine Posts verfügbar
        </div>
      ) : (
        <div className="flex items-end justify-between gap-3 h-72">
          {topPosts.map((post, index) => {
            const heightPercent = (post.interactions / maxInteractions) * 100;
            return (
              <div key={post.post_id} className="flex-1 flex flex-col items-center">
                {/* Interaction count */}
                <span className="text-white text-sm font-bold mb-2">
                  {formatNumber(post.interactions)}
                </span>
                
                {/* Post image - größer wie im alten Dashboard */}
                <div className="w-16 h-16 mb-2 rounded-lg overflow-hidden bg-[#262626] flex-shrink-0 border border-[#363636]">
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
                  style={{ height: `${Math.max(heightPercent * 0.55, 20)}%` }}
                ></div>
                
                {/* Label */}
                <span className="text-gray-500 text-xs mt-2">Post {index + 1}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
