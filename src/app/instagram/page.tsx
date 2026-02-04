'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Users, UserPlus, FileText, Heart, MessageCircle, Eye, Bookmark, Play, Image as ImageIcon } from 'lucide-react';
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
  igFollowers: number;
  igLikes: number;
  igComments: number;
  igSaves: number;
  igReach: number;
  igPosts: number;
  prevIgFollowers?: number;
  prevIgLikes?: number;
  prevIgComments?: number;
  prevIgSaves?: number;
  prevIgReach?: number;
  prevIgPosts?: number;
}

interface Post {
  post_id: string;
  message: string;
  type: string;
  created_time: string;
  permalink: string;
  thumbnail_url?: string;
  media_url?: string;
  reactions_total: number;
  comments_total: number;
  likes?: number;
  saves?: number;
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
  accentColor?: 'gray' | 'yellow' | 'green' | 'red' | 'pink' | 'purple';
  showTrend?: boolean;
}) {
  const hasChange = change !== undefined && change !== null && showTrend;
  const isPositive = hasChange && change >= 0;
  
  const borderColors = {
    gray: 'border-l-gray-500',
    yellow: 'border-l-yellow-500',
    green: 'border-l-green-500',
    red: 'border-l-red-500',
    pink: 'border-l-pink-500',
    purple: 'border-l-purple-500'
  };

  const iconColors = {
    gray: 'text-gray-400',
    yellow: 'text-yellow-400',
    green: 'text-green-400',
    red: 'text-red-400',
    pink: 'text-pink-400',
    purple: 'text-purple-400'
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

// Engagement Rate Card
function EngagementRateCard({ interactions, reach }: { interactions: number; reach: number }) {
  const rate = reach > 0 ? (interactions / reach) * 100 : 0;
  const status = rate >= 5 ? 'Hoch' : rate >= 1 ? 'Gut' : 'Niedrig';
  const statusColor = rate >= 5 ? 'text-green-400 bg-green-500/20' : rate >= 1 ? 'text-yellow-400 bg-yellow-500/20' : 'text-red-400 bg-red-500/20';
  const rateColor = rate >= 5 ? 'text-green-400' : rate >= 1 ? 'text-purple-400' : 'text-red-400';
  const gaugePosition = Math.min(rate * 10, 100);
  
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-400 text-xs sm:text-sm flex items-center gap-2">
          <Heart className="w-4 h-4 text-pink-400" />
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
      <div className={`bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center ${className}`}>
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

function InstagramContent() {
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
      fetch(`/api/instagram/posts?${params}`).then(res => res.json())
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

  const interactions = stats ? stats.igLikes + stats.igComments : 0;
  const prevInteractions = stats?.prevIgLikes && stats?.prevIgComments 
    ? stats.prevIgLikes + stats.prevIgComments 
    : 0;

  // Berechne neue Follower
  const newFollowers = stats && stats.prevIgFollowers !== undefined 
    ? stats.igFollowers - stats.prevIgFollowers 
    : 0;
  const isFollowerGrowth = newFollowers >= 0;

  return (
    <div>
      {/* Header - Responsive */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 lg:mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 lg:w-7 lg:h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl lg:text-3xl font-bold text-white">Instagram Analytics</h1>
            <p className="text-gray-500 text-sm mt-1">Detaillierte KPIs und Top Posts für {monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth}</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="bg-[#1f1f1f] text-white border border-[#262626] rounded-lg px-3 sm:px-4 py-2 text-sm focus:border-purple-500 focus:outline-none"
          >
            <option value="all">Alle Kunden</option>
            {customers.map(c => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
          
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-[#1f1f1f] text-white border border-[#262626] rounded-lg px-3 sm:px-4 py-2 text-sm focus:border-purple-500 focus:outline-none"
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : stats ? (
        <>
          {/* KPI Cards - 9 Karten in 3 Reihen */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
            <KPICard 
              title="Follower" 
              value={stats.igFollowers} 
              icon={Users}
              change={stats.prevIgFollowers ? getPercentChange(stats.igFollowers, stats.prevIgFollowers) : undefined}
              changeValue={newFollowers}
              accentColor="purple"
            />
            <NewFollowersCard 
              newFollowers={newFollowers}
              isPositive={isFollowerGrowth}
            />
            <KPICard 
              title="Beiträge" 
              value={stats.igPosts} 
              icon={FileText}
              change={stats.prevIgPosts ? getPercentChange(stats.igPosts, stats.prevIgPosts) : undefined}
              changeValue={stats.prevIgPosts ? stats.igPosts - stats.prevIgPosts : undefined}
              accentColor="yellow"
            />
            <KPICard 
              title="Likes" 
              value={stats.igLikes} 
              icon={Heart}
              change={stats.prevIgLikes ? getPercentChange(stats.igLikes, stats.prevIgLikes) : undefined}
              changeValue={stats.prevIgLikes ? stats.igLikes - stats.prevIgLikes : undefined}
              accentColor="pink"
            />
            <KPICard 
              title="Interaktionen" 
              value={interactions} 
              icon={MessageCircle}
              change={prevInteractions ? getPercentChange(interactions, prevInteractions) : undefined}
              changeValue={prevInteractions ? interactions - prevInteractions : undefined}
              accentColor="purple"
            />
            <KPICard 
              title="Gespeichert" 
              value={stats.igSaves} 
              icon={Bookmark}
              change={stats.prevIgSaves ? getPercentChange(stats.igSaves, stats.prevIgSaves) : undefined}
              changeValue={stats.prevIgSaves ? stats.igSaves - stats.prevIgSaves : undefined}
              accentColor="yellow"
            />
          </div>

          {/* Zweite Reihe KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <KPICard 
              title="Reichweite" 
              value={stats.igReach} 
              icon={Eye}
              change={stats.prevIgReach ? getPercentChange(stats.igReach, stats.prevIgReach) : undefined}
              changeValue={stats.prevIgReach ? stats.igReach - stats.prevIgReach : undefined}
              accentColor="green"
            />
            <KPICard 
              title="Ø Reichweite/Post" 
              value={stats.igPosts > 0 ? Math.round(stats.igReach / stats.igPosts) : 0} 
              icon={Eye}
              showTrend={false}
              accentColor="green"
            />
            <KPICard 
              title="Video Plays" 
              value={0} 
              icon={Play}
              showTrend={false}
              accentColor="pink"
            />
          </div>

          {/* Top Posts Section */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5 mb-6">
            <h3 className="text-white font-bold mb-2">Top 10 Posts</h3>
            <p className="text-gray-500 text-sm mb-4">Sortiert nach Interaktionen (Likes + Comments)</p>
            
            <div className="space-y-4">
              {posts.slice(0, 10).map((post, index) => (
                <div key={post.post_id} className="flex gap-4 p-4 bg-[#1a1a1a] rounded-xl border border-[#262626] hover:border-purple-500/50 transition-colors">
                  {/* Rang */}
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  
                  {/* Thumbnail */}
                  <PostImage 
                    src={post.thumbnail_url || post.media_url}
                    alt={`Post ${index + 1}`}
                    className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden"
                  />
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm line-clamp-2 mb-2">{post.message || 'Kein Text'}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                      <span>{new Date(post.created_time).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-pink-400" /> {post.likes || post.reactions_total}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> {post.comments_total}
                      </span>
                      {post.saves && (
                        <span className="flex items-center gap-1">
                          <Bookmark className="w-3 h-3" /> {post.saves}
                        </span>
                      )}
                      {post.reach && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {formatNumber(post.reach)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Interaktionen Badge */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-purple-400 font-bold text-lg">{(post.likes || post.reactions_total) + post.comments_total}</div>
                    <div className="text-gray-500 text-xs">Interaktionen</div>
                  </div>
                </div>
              ))}
              
              {posts.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  Keine Daten für diesen Monat verfügbar
                </div>
              )}
            </div>
          </div>

          {/* Instagram API Notice */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-pink-500 flex-shrink-0" size={20} />
              <div>
                <h3 className="font-bold text-pink-500 mb-2 text-sm sm:text-base">Instagram API Hinweise</h3>
                <div className="space-y-1 text-xs sm:text-sm">
                  <p><span className="text-gray-400 font-medium">Reichweite:</span> <span className="text-gray-500">Nur für Business/Creator Accounts verfügbar.</span></p>
                  <p><span className="text-gray-400 font-medium">Saves:</span> <span className="text-gray-500">Verfügbar für Insights-berechtigte Accounts.</span></p>
                  <p><span className="text-gray-400 font-medium">Stories:</span> <span className="text-gray-500">Nur 24h verfügbar, werden nicht gecacht.</span></p>
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

export default function InstagramPage() {
  return (
    <DashboardLayout>
      <InstagramContent />
    </DashboardLayout>
  );
}
