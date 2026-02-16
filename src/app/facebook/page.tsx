'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Users, UserPlus, FileText, ThumbsUp, MessageCircle, Eye, Share2, Image as ImageIcon, Play, TrendingUp, BarChart3 } from 'lucide-react';
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
  fbShares: number;
  fbReach: number;
  fbImpressions: number;
  fbVideoViews: number;
  fbPosts: number;
  prevFbFollowers?: number;
  prevFbReactions?: number;
  prevFbComments?: number;
  prevFbShares?: number;
  prevFbReach?: number;
  prevFbImpressions?: number;
  prevFbVideoViews?: number;
  prevFbPosts?: number;
}

interface Post {
  post_id: string;
  page_id: string;
  message: string;
  type: string;
  created_time: string;
  permalink: string;
  thumbnail_url?: string;
  og_image_url?: string;
  media_url?: string;
  image_url?: string;
  reactions_total: number;
  comments_total: number;
  shares_total?: number;
  reach?: number;
  impressions?: number;
  video_views?: number;
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

// KPI Card Component
function KPICard({ title, value, icon: Icon, change, changeValue, accentColor = 'gray', showTrend = true }: { 
  title: string; 
  value: number | string; 
  icon: React.ElementType;
  change?: number;
  changeValue?: number;
  accentColor?: 'gray' | 'yellow' | 'green' | 'red' | 'blue' | 'lime' | 'purple';
  showTrend?: boolean;
}) {
  const hasChange = change !== undefined && change !== null && showTrend;
  const isPositive = hasChange && change >= 0;
  
  const borderColors: Record<string, string> = {
    gray: 'border-l-gray-500',
    yellow: 'border-l-yellow-500',
    green: 'border-l-green-500',
    red: 'border-l-red-500',
    blue: 'border-l-blue-500',
    lime: 'border-l-[#84cc16]',
    purple: 'border-l-purple-500'
  };

  const iconColors: Record<string, string> = {
    gray: 'text-gray-400',
    yellow: 'text-yellow-400',
    green: 'text-green-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
    lime: 'text-[#84cc16]',
    purple: 'text-purple-400'
  };
  
  return (
    <div className={`bg-[#141414] border border-[#262626] ${borderColors[accentColor]} border-l-4 rounded-xl p-3 sm:p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-[10px] sm:text-xs uppercase tracking-wider font-medium">{title}</span>
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColors[accentColor]}`} />
      </div>
      <div className="text-xl sm:text-2xl font-bold text-white mb-1">
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

// Neue Follower Card
function NewFollowersCard({ newFollowers, isPositive, hasData }: { newFollowers: number; isPositive: boolean; hasData: boolean }) {
  // Wenn keine Vormonatsdaten existieren, zeige "-" statt falscher Werte
  const showNoData = !hasData || (newFollowers > 10000 && isPositive); // Unrealistisch hohe Werte = keine echten Vormonatsdaten
  
  return (
    <div className={`bg-[#141414] border border-[#262626] ${showNoData ? 'border-l-gray-500' : isPositive ? 'border-l-green-500' : 'border-l-red-500'} border-l-4 rounded-xl p-3 sm:p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-[10px] sm:text-xs uppercase tracking-wider font-medium">Neue Follower</span>
        <UserPlus className={`w-4 h-4 sm:w-5 sm:h-5 ${showNoData ? 'text-gray-400' : isPositive ? 'text-green-400' : 'text-red-400'}`} />
      </div>
      <div className={`text-xl sm:text-2xl font-bold ${showNoData ? 'text-gray-400' : isPositive ? 'text-green-400' : 'text-red-400'} mb-1`}>
        {showNoData ? '-' : (isPositive ? '+' : '') + formatNumberRaw(newFollowers)}
      </div>
      <p className="text-gray-500 text-[10px] sm:text-xs">{showNoData ? 'Keine Vormonatsdaten' : 'vs. Vormonat'}</p>
    </div>
  );
}

// Engagement Rate Card
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
          <TrendingUp className="w-4 h-4 text-[#84cc16]" />
          <span className="uppercase tracking-wider">Engagement Rate</span>
        </h3>
        <span className={`text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded ${statusColor}`}>
          {status}
        </span>
      </div>
      
      <div className={`text-3xl sm:text-4xl font-bold ${rateColor} mb-4`}>{rate.toFixed(2)}%</div>
      
      <div className="relative h-2 bg-[#262626] rounded-full mb-2">
        <div className="absolute h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full" style={{ width: '100%' }}></div>
        <div className={`absolute w-3 h-3 rounded-full -top-0.5 ${rate < 1 ? 'bg-red-500' : rate < 5 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ left: `calc(${gaugePosition}% - 6px)` }}></div>
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

// Post Image Component - thumbnail_url from API already points to /api/image-proxy
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
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Default to January 2026 since that has the most data
    const now = new Date();
    if (now.getMonth() === 1 && now.getFullYear() === 2026) {
      return '2026-01'; // If we're in Feb 2026, show Jan 2026
    }
    return now.toISOString().slice(0, 7);
  });
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
        setPosts(Array.isArray(postsData?.posts) ? postsData.posts : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedMonth, selectedCustomer]);

  const monthOptions = getMonthOptions();
  
  // Calculate metrics
  const interactions = stats ? stats.fbReactions + stats.fbComments : 0;
  const prevInteractions = stats?.prevFbReactions && stats?.prevFbComments 
    ? stats.prevFbReactions + stats.prevFbComments 
    : 0;
  const newFollowers = stats && stats.prevFbFollowers !== undefined 
    ? stats.fbFollowers - stats.prevFbFollowers 
    : 0;
  const isFollowerGrowth = newFollowers >= 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 lg:mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 lg:w-7 lg:h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl lg:text-3xl font-bold text-white">Facebook Analytics</h1>
            <p className="text-gray-500 text-sm mt-1">Meta Partner Dashboard für {monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth}</p>
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
          {/* KPI Cards - 8 Karten mit allen Meta Partner Metriken */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4 mb-6">
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
              hasData={stats.prevFbFollowers !== undefined && stats.prevFbFollowers > 0}
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
              title="Kommentare" 
              value={stats.fbComments} 
              icon={MessageCircle}
              change={stats.prevFbComments ? getPercentChange(stats.fbComments, stats.prevFbComments) : undefined}
              changeValue={stats.prevFbComments ? stats.fbComments - stats.prevFbComments : undefined}
              accentColor="lime"
            />
            <KPICard 
              title="Shares" 
              value={stats.fbShares || 0} 
              icon={Share2}
              change={stats.prevFbShares ? getPercentChange(stats.fbShares || 0, stats.prevFbShares) : undefined}
              changeValue={stats.prevFbShares ? (stats.fbShares || 0) - stats.prevFbShares : undefined}
              accentColor="purple"
            />
            <KPICard 
              title="Reichweite" 
              value={stats.fbReach} 
              icon={Eye}
              change={stats.prevFbReach ? getPercentChange(stats.fbReach, stats.prevFbReach) : undefined}
              changeValue={stats.prevFbReach ? stats.fbReach - stats.prevFbReach : undefined}
              accentColor="yellow"
            />
            <KPICard 
              title="Video Views" 
              value={stats.fbVideoViews || 0} 
              icon={Play}
              change={stats.prevFbVideoViews ? getPercentChange(stats.fbVideoViews || 0, stats.prevFbVideoViews) : undefined}
              changeValue={stats.prevFbVideoViews ? (stats.fbVideoViews || 0) - stats.prevFbVideoViews : undefined}
              accentColor="red"
            />
          </div>

          {/* Engagement Rate + Impressions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <EngagementRateCard interactions={interactions} reach={stats.fbReach} />
            
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-[#84cc16]" />
                <h3 className="text-white font-bold">Impressions & Reichweite</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#1a1a1a] rounded-lg p-4">
                  <p className="text-gray-400 text-xs uppercase mb-2">Impressions</p>
                  <p className="text-2xl font-bold text-white">{formatNumber(stats.fbImpressions || 0)}</p>
                  {stats.prevFbImpressions && (
                    <p className={`text-xs mt-1 ${(stats.fbImpressions || 0) >= stats.prevFbImpressions ? 'text-green-400' : 'text-red-400'}`}>
                      {(stats.fbImpressions || 0) >= stats.prevFbImpressions ? '↑' : '↓'} {Math.abs(getPercentChange(stats.fbImpressions || 0, stats.prevFbImpressions)).toFixed(1)}% vs. Vormonat
                    </p>
                  )}
                </div>
                <div className="bg-[#1a1a1a] rounded-lg p-4">
                  <p className="text-gray-400 text-xs uppercase mb-2">Reichweite</p>
                  <p className="text-2xl font-bold text-white">{formatNumber(stats.fbReach)}</p>
                  {stats.prevFbReach && (
                    <p className={`text-xs mt-1 ${stats.fbReach >= stats.prevFbReach ? 'text-green-400' : 'text-red-400'}`}>
                      {stats.fbReach >= stats.prevFbReach ? '↑' : '↓'} {Math.abs(getPercentChange(stats.fbReach, stats.prevFbReach)).toFixed(1)}% vs. Vormonat
                    </p>
                  )}
                </div>
                <div className="bg-[#1a1a1a] rounded-lg p-4">
                  <p className="text-gray-400 text-xs uppercase mb-2">Ø Reichweite/Post</p>
                  <p className="text-2xl font-bold text-white">{stats.fbPosts > 0 ? formatNumber(Math.round(stats.fbReach / stats.fbPosts)) : 0}</p>
                </div>
                <div className="bg-[#1a1a1a] rounded-lg p-4">
                  <p className="text-gray-400 text-xs uppercase mb-2">Ø Impressions/Post</p>
                  <p className="text-2xl font-bold text-white">{stats.fbPosts > 0 ? formatNumber(Math.round((stats.fbImpressions || 0) / stats.fbPosts)) : 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Posts Section */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5 mb-6">
            <h3 className="text-white font-bold mb-2">Top 10 Posts</h3>
            <p className="text-gray-500 text-sm mb-4">Sortiert nach Interaktionen (Reactions + Comments) • {posts.length} Posts geladen</p>
            
            <div className="space-y-4">
              {posts.slice(0, 10).map((post, index) => (
                <div key={post.post_id} className="flex gap-4 p-4 bg-[#1a1a1a] rounded-xl border border-[#262626] hover:border-[#84cc16]/50 transition-colors">
                  {/* Rang */}
                  <div className="flex-shrink-0 w-8 h-8 bg-[#84cc16] rounded-full flex items-center justify-center text-black font-bold text-sm">
                    {index + 1}
                  </div>
                  
                  {/* Thumbnail - API returns proxy URL for fresh images */}
                  <PostImage 
                    src={post.thumbnail_url}
                    alt={`Post ${index + 1}`}
                    className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden"
                  />
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm line-clamp-2 mb-2">{post.message || 'Kein Text'}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                      <span>{new Date(post.created_time).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                      <span className="text-blue-400">{post.type}</span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" /> {formatNumber(post.reactions_total)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> {formatNumber(post.comments_total)}
                      </span>
                      {post.shares_total !== undefined && post.shares_total > 0 && (
                        <span className="flex items-center gap-1">
                          <Share2 className="w-3 h-3" /> {formatNumber(post.shares_total)}
                        </span>
                      )}
                      {post.reach !== undefined && post.reach > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {formatNumber(post.reach)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Interaktionen Badge */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-[#84cc16] font-bold text-lg">{formatNumber(post.reactions_total + post.comments_total)}</div>
                    <div className="text-gray-500 text-xs">Interaktionen</div>
                  </div>
                </div>
              ))}
              
              {posts.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <p>Keine Posts für diesen Monat verfügbar</p>
                  <p className="text-xs mt-2">Versuche einen anderen Monat wie Januar 2026</p>
                </div>
              )}
            </div>
          </div>

          {/* Meta Partner Badge */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-white">Meta Business Partner</h3>
                <p className="text-gray-500 text-sm">Alle verfügbaren Graph API Metriken werden abgerufen</p>
              </div>
              <div className="ml-auto">
                <span className="bg-blue-600/20 text-blue-400 text-xs font-medium px-3 py-1 rounded-full">Verifiziert</span>
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
