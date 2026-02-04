'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Users, UserPlus, FileText, ThumbsUp, MessageCircle, Eye, Share2, Image as ImageIcon } from 'lucide-react';
import Top5PostsChart from '@/components/Top5PostsChart';
import TopPostsList from '@/components/TopPostsList';
import PostsTable from '@/components/PostsTable';
import { DashboardLayout } from '@/components/DashboardLayout';

interface Customer {
  id: number;
  name: string;
  slug: string;
}

interface Stats {
  fbFollowers: number;
  fbReactions: number;
  fbComments: number;
  fbReach: number;
  fbPosts: number;
  prevFbFollowers?: number;
  prevFbReactions?: number;
  prevFbComments?: number;
  prevFbReach?: number;
  prevFbPosts?: number;
}

interface Post {
  post_id: string;
  message: string;
  type: string;
  created_time: string;
  permalink: string;
  thumbnail_url?: string;
  media_url?: string;
  full_picture?: string;
  reactions_total: number;
  comments_total: number;
  shares_total?: number;
  reach?: number;
  impressions?: number;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString('de-DE');
}

function formatNumberRaw(num: number): string {
  return num.toLocaleString('de-DE');
}

function getPercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = date.toISOString().slice(0, 7);
    const label = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  return options;
}

// KPI Card - mit farbigem linken Rahmen und Lucide Icons
function KPICard({ title, value, icon: Icon, change, changeValue, accentColor = 'gray', showTrend = true }: { 
  title: string; 
  value: number | string; 
  icon: React.ElementType;
  change?: number;
  changeValue?: number;
  accentColor?: 'gray' | 'yellow' | 'green' | 'red' | 'blue' | 'lime';
  showTrend?: boolean;
}) {
  const hasChange = change !== undefined && change !== null && showTrend;
  const isPositive = hasChange && change >= 0;
  
  const borderColors = {
    gray: 'border-l-gray-500',
    yellow: 'border-l-yellow-500',
    green: 'border-l-green-500',
    red: 'border-l-red-500',
    blue: 'border-l-blue-500',
    lime: 'border-l-[#84cc16]'
  };

  const iconColors = {
    gray: 'text-gray-400',
    yellow: 'text-yellow-400',
    green: 'text-green-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
    lime: 'text-[#84cc16]'
  };
  
  return (
    <div className={`bg-[#141414] border border-[#262626] ${borderColors[accentColor]} border-l-4 rounded-xl p-3 sm:p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-[10px] sm:text-xs uppercase tracking-wider font-medium">{title}</span>
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColors[accentColor]}`} />
      </div>
      <div className="text-xl sm:text-3xl font-bold text-white mb-1">
        {typeof value === 'number' ? formatNumber(value) : value}
      </div>
      {hasChange && (
        <div className="flex items-center gap-2">
          <span className={`text-[10px] sm:text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '↑' : '↓'} {changeValue !== undefined ? formatNumberRaw(Math.abs(changeValue)) : ''} ({Math.abs(change).toFixed(1)}%)
          </span>
        </div>
      )}
      {!hasChange && <p className="text-gray-500 text-[10px] sm:text-xs">-</p>}
    </div>
  );
}

// Neue Follower Card - speziell für die Anzeige der neuen Follower
function NewFollowersCard({ newFollowers, isPositive }: { newFollowers: number; isPositive: boolean }) {
  return (
    <div className={`bg-[#141414] border border-[#262626] ${isPositive ? 'border-l-green-500' : 'border-l-red-500'} border-l-4 rounded-xl p-3 sm:p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-[10px] sm:text-xs uppercase tracking-wider font-medium">Neue Follower</span>
        <UserPlus className={`w-4 h-4 sm:w-5 sm:h-5 ${isPositive ? 'text-green-400' : 'text-red-400'}`} />
      </div>
      <div className={`text-xl sm:text-3xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'} mb-1`}>
        {isPositive ? '+' : ''}{formatNumberRaw(newFollowers)}
      </div>
      <p className="text-gray-500 text-[10px] sm:text-xs">vs. Vormonat</p>
    </div>
  );
}

// Interaction Compare Card - mit farbiger Akzentlinie links wie im alten Dashboard
function InteractionCompareCard({ title, current, previous, currentLabel, prevLabel }: {
  title: string;
  current: number;
  previous: number;
  currentLabel: string;
  prevLabel: string;
}) {
  return (
    <div className="bg-[#141414] border border-[#262626] border-l-yellow-500 border-l-4 rounded-xl p-4 sm:p-5">
      <h3 className="text-gray-400 text-xs sm:text-sm uppercase tracking-wider mb-3 sm:mb-4">{title}</h3>
      <div className="flex justify-between items-end">
        <div>
          <p className="text-yellow-500 text-[10px] sm:text-xs mb-1">{currentLabel}</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-400">{formatNumberRaw(current)}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 text-[10px] sm:text-xs mb-1">{prevLabel}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-400">{formatNumberRaw(previous)}</p>
        </div>
      </div>
    </div>
  );
}

// Engagement Rate Card - mit rotem Status wenn niedrig wie im alten Dashboard
function EngagementRateCard({ interactions, reach }: { interactions: number; reach: number }) {
  const rate = reach > 0 ? (interactions / reach) * 100 : 0;
  const status = rate >= 5 ? 'Hoch' : rate >= 1 ? 'Gut' : 'Niedrig';
  const statusColor = rate >= 5 ? 'text-green-400 bg-green-500/20' : rate >= 1 ? 'text-yellow-400 bg-yellow-500/20' : 'text-red-400 bg-red-500/20';
  const rateColor = rate >= 5 ? 'text-green-400' : rate >= 1 ? 'text-[#84cc16]' : 'text-red-400';
  const gaugePosition = Math.min(rate * 10, 100);
  
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-400 text-xs sm:text-sm flex items-center gap-2">
          <ThumbsUp className="w-4 h-4 text-[#84cc16]" />
          <span className="uppercase tracking-wider">Engagement Rate</span>
        </h3>
        <span className={`text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded ${statusColor}`}>
          {status}
        </span>
      </div>
      
      <div className={`text-3xl sm:text-5xl font-bold ${rateColor} mb-4`}>{rate.toFixed(2)}%</div>
      
      {/* Gauge mit farbigem Punkt */}
      <div className="relative h-2 bg-[#262626] rounded-full mb-2">
        <div 
          className="absolute h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
          style={{ width: '100%' }}
        ></div>
        <div 
          className={`absolute w-3 h-3 rounded-full -top-0.5 ${rate < 1 ? 'bg-red-500' : rate < 5 ? 'bg-yellow-500' : 'bg-green-500'}`}
          style={{ left: `calc(${gaugePosition}% - 6px)` }}
        ></div>
      </div>
      <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 mb-4">
        <span>0%</span>
        <span>5%</span>
        <span>10%+</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#262626]">
        <div>
          <p className="text-gray-500 text-[10px] sm:text-xs">Interaktionen</p>
          <p className="text-base sm:text-lg font-bold text-white">{formatNumberRaw(interactions)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-[10px] sm:text-xs">Reichweite</p>
          <p className="text-base sm:text-lg font-bold text-white">{formatNumberRaw(reach)}</p>
        </div>
      </div>
      <p className="text-gray-600 text-[10px] sm:text-xs mt-3">Berechnung: Interaktionen ÷ Reichweite × 100</p>
    </div>
  );
}

// Post Image Component mit Fallback
function PostImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!src || error) {
    return (
      <div className={`bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center ${className}`}>
        <ImageIcon className="w-8 h-8 text-white/50" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-[#262626] animate-pulse flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-gray-600" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />
    </div>
  );
}

function FacebookContent() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/customers')
      .then(res => res.json())
      .then(data => setCustomers(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ month: selectedMonth });
    if (selectedCustomer !== 'all') params.append('customer', selectedCustomer);
    
    Promise.all([
      fetch(`/api/stats?${params}`).then(res => res.json()),
      fetch(`/api/facebook/posts?${params}`).then(res => res.json())
    ])
      .then(([statsData, postsData]) => {
        setStats(statsData);
        setPosts(Array.isArray(postsData?.posts) ? postsData.posts : (Array.isArray(postsData) ? postsData : []));
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedMonth, selectedCustomer]);

  const monthOptions = getMonthOptions();
  const currentMonthLabel = selectedMonth.slice(5, 7) + '/' + selectedMonth.slice(0, 4);
  const prevMonthDate = new Date(selectedMonth + '-01');
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const prevMonthLabel = (prevMonthDate.getMonth() + 1).toString().padStart(2, '0') + '/' + prevMonthDate.getFullYear();

  const interactions = stats ? stats.fbReactions + stats.fbComments : 0;
  const prevInteractions = stats?.prevFbReactions && stats?.prevFbComments 
    ? stats.prevFbReactions + stats.prevFbComments 
    : 0;

  // Berechne neue Follower
  const newFollowers = stats && stats.prevFbFollowers !== undefined 
    ? stats.fbFollowers - stats.prevFbFollowers 
    : 0;
  const isFollowerGrowth = newFollowers >= 0;

  return (
    <div>
      {/* Header - Responsive */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 lg:mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 lg:w-7 lg:h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl lg:text-3xl font-bold text-white">Facebook Analytics</h1>
            <p className="text-gray-500 text-sm mt-1">Detaillierte KPIs und Top Posts für {monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth}</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="bg-[#1f1f1f] text-white border border-[#262626] rounded-lg px-3 sm:px-4 py-2 text-sm focus:border-[#84cc16] focus:outline-none"
          >
            <option value="all">Alle Kunden</option>
            {customers.map(c => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
          
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-[#1f1f1f] text-white border border-[#262626] rounded-lg px-3 sm:px-4 py-2 text-sm focus:border-[#84cc16] focus:outline-none"
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#84cc16]"></div>
        </div>
      ) : stats ? (
        <>
          {/* KPI Cards - 6 Karten inkl. Neue Follower */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
            <KPICard 
              title="Follower" 
              value={stats.fbFollowers} 
              icon={Users}
              change={stats.prevFbFollowers ? getPercentChange(stats.fbFollowers, stats.prevFbFollowers) : undefined}
              changeValue={newFollowers}
              accentColor="blue"
            />
            <NewFollowersCard 
              newFollowers={newFollowers}
              isPositive={isFollowerGrowth}
            />
            <KPICard 
              title="Beiträge" 
              value={stats.fbPosts} 
              icon={FileText}
              change={stats.prevFbPosts ? getPercentChange(stats.fbPosts, stats.prevFbPosts) : undefined}
              changeValue={stats.prevFbPosts ? stats.fbPosts - stats.prevFbPosts : undefined}
              accentColor="yellow"
            />
            <KPICard 
              title="Reactions" 
              value={stats.fbReactions} 
              icon={ThumbsUp}
              change={stats.prevFbReactions ? getPercentChange(stats.fbReactions, stats.prevFbReactions) : undefined}
              changeValue={stats.prevFbReactions ? stats.fbReactions - stats.prevFbReactions : undefined}
              accentColor="green"
            />
            <KPICard 
              title="Interaktionen" 
              value={interactions} 
              icon={MessageCircle}
              change={prevInteractions ? getPercentChange(interactions, prevInteractions) : undefined}
              changeValue={prevInteractions ? interactions - prevInteractions : undefined}
              accentColor="lime"
            />
            <KPICard 
              title="Reichweite" 
              value={stats.fbReach} 
              icon={Eye}
              change={stats.prevFbReach ? getPercentChange(stats.fbReach, stats.prevFbReach) : undefined}
              changeValue={stats.prevFbReach ? stats.fbReach - stats.prevFbReach : undefined}
              accentColor="yellow"
            />
          </div>

          {/* Statistiken pro Page */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5 mb-6">
            <h3 className="text-white font-bold mb-4">Statistiken pro Page</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs uppercase">
                    <th className="text-left pb-3">Page ID</th>
                    <th className="text-right pb-3">Posts</th>
                    <th className="text-right pb-3">Reactions</th>
                    <th className="text-right pb-3">Comments</th>
                    <th className="text-right pb-3">Interaktionen</th>
                    <th className="text-right pb-3">Reichweite</th>
                    <th className="text-right pb-3">Ø Reichweite</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[#262626]">
                    <td className="py-3 text-gray-300">457659770243</td>
                    <td className="py-3 text-right text-white">{stats.fbPosts}</td>
                    <td className="py-3 text-right text-white">{formatNumberRaw(stats.fbReactions)}</td>
                    <td className="py-3 text-right text-white">{formatNumberRaw(stats.fbComments)}</td>
                    <td className="py-3 text-right text-[#84cc16] font-medium">{formatNumberRaw(interactions)}</td>
                    <td className="py-3 text-right text-white">{formatNumberRaw(stats.fbReach)}</td>
                    <td className="py-3 text-right text-white">{stats.fbPosts > 0 ? formatNumberRaw(Math.round(stats.fbReach / stats.fbPosts)) : 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Posts Section */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5 mb-6">
            <h3 className="text-white font-bold mb-2">Top 10 Posts</h3>
            <p className="text-gray-500 text-sm mb-4">Sortiert nach Interaktionen (Reactions + Comments)</p>
            
            <div className="space-y-4">
              {posts.slice(0, 10).map((post, index) => (
                <div key={post.post_id} className="flex gap-4 p-4 bg-[#1a1a1a] rounded-xl border border-[#262626] hover:border-[#84cc16]/50 transition-colors">
                  {/* Rang */}
                  <div className="flex-shrink-0 w-8 h-8 bg-[#84cc16] rounded-full flex items-center justify-center text-black font-bold text-sm">
                    {index + 1}
                  </div>
                  
                  {/* Thumbnail */}
                  <PostImage 
                    src={post.thumbnail_url || post.full_picture || post.media_url}
                    alt={`Post ${index + 1}`}
                    className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden"
                  />
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm line-clamp-2 mb-2">{post.message || 'Kein Text'}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                      <span>{new Date(post.created_time).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" /> {post.reactions_total}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> {post.comments_total}
                      </span>
                      {post.reach && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {formatNumber(post.reach)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Interaktionen Badge */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-[#84cc16] font-bold text-lg">{post.reactions_total + post.comments_total}</div>
                    <div className="text-gray-500 text-xs">Interaktionen</div>
                  </div>
                </div>
              ))}
              
              {posts.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  Keine Posts für diesen Monat verfügbar
                </div>
              )}
            </div>
          </div>

          {/* API Limitations Notice */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-yellow-500 flex-shrink-0" size={20} />
              <div>
                <h3 className="font-bold text-yellow-500 mb-2 text-sm sm:text-base">Facebook API Einschränkungen</h3>
                <div className="space-y-1 text-xs sm:text-sm">
                  <p><span className="text-gray-400 font-medium">Shares:</span> <span className="text-gray-500">Nicht für alle Posts verfügbar, daher separat ausgewiesen und nicht in Interaktionen enthalten.</span></p>
                  <p><span className="text-gray-400 font-medium">Saves:</span> <span className="text-gray-500">Nicht über die Graph API abrufbar und werden nicht angezeigt.</span></p>
                  <p><span className="text-gray-400 font-medium">Organisch vs. Paid:</span> <span className="text-gray-500">Nur über Ads API verfügbar (nicht implementiert).</span></p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500 py-12">
          Keine Daten verfügbar
        </div>
      )}
    </div>
  );
}

export default function FacebookPage() {
  return (
    <DashboardLayout>
      <FacebookContent />
    </DashboardLayout>
  );
}
