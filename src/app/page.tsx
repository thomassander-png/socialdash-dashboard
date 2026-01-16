'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Stats {
  totalFollowers: number;
  totalReach: number;
  totalInteractions: number;
  totalPosts: number;
  fbFollowers: number;
  fbReactions: number;
  fbComments: number;
  fbReach: number;
  fbPosts: number;
  igFollowers: number;
  igLikes: number;
  igComments: number;
  igSaves: number;
  igReach: number;
  igPosts: number;
  prevTotalFollowers?: number;
  prevTotalReach?: number;
  prevTotalInteractions?: number;
  prevTotalPosts?: number;
  prevFbInteractions?: number;
  prevIgInteractions?: number;
}

interface Customer {
  id: number;
  name: string;
  slug: string;
}

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

// KPI Card Component - mit farbigem linken Rahmen wie im alten Dashboard
function KPICard({ title, value, emoji, change, accentColor }: { 
  title: string; 
  value: number; 
  emoji: string;
  change?: number;
  accentColor: 'gray' | 'yellow' | 'green' | 'red';
}) {
  const hasChange = change !== undefined && change !== null;
  const isPositive = hasChange && change >= 0;
  
  const borderColors = {
    gray: 'border-l-gray-500',
    yellow: 'border-l-yellow-500',
    green: 'border-l-green-500',
    red: 'border-l-red-500'
  };
  
  return (
    <div className={`bg-[#141414] border border-[#262626] ${borderColors[accentColor]} border-l-4 rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-xs uppercase tracking-wider font-medium">{title}</span>
        <div className="flex items-center gap-2">
          {hasChange && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
            </span>
          )}
          <span className="text-xl">{emoji}</span>
        </div>
      </div>
      <div className="text-4xl font-bold text-white mb-2">
        {formatNumberRaw(value)}
      </div>
      <p className="text-gray-500 text-xs">vs. Vormonat</p>
    </div>
  );
}

// Interaction Compare Card - mit farbiger Akzentlinie links wie im alten Dashboard
function InteractionCompareCard({ title, platform, current, previous, currentLabel, prevLabel }: {
  title: string;
  platform: 'facebook' | 'instagram';
  current: number;
  previous: number;
  currentLabel: string;
  prevLabel: string;
}) {
  const accentColor = platform === 'facebook' ? 'border-l-yellow-500' : 'border-l-green-500';
  const labelColor = platform === 'facebook' ? 'text-yellow-500' : 'text-green-500';
  const valueColor = platform === 'facebook' ? 'text-blue-400' : 'text-pink-400';
  
  return (
    <div className={`bg-[#141414] border border-[#262626] ${accentColor} border-l-4 rounded-xl p-5`}>
      <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-4">{title}</h3>
      <div className="flex justify-between items-end">
        <div>
          <p className={`text-xs mb-1 ${labelColor}`}>{currentLabel}</p>
          <p className={`text-3xl font-bold ${valueColor}`}>{formatNumberRaw(current)}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 text-xs mb-1">{prevLabel}</p>
          <p className="text-2xl font-bold text-gray-400">{formatNumberRaw(previous)}</p>
        </div>
      </div>
    </div>
  );
}

// Engagement Rate Card - mit rotem Status wenn niedrig wie im alten Dashboard
function EngagementRateCard({ interactions, reach, prevRate }: { interactions: number; reach: number; prevRate?: number }) {
  const rate = reach > 0 ? (interactions / reach) * 100 : 0;
  const status = rate >= 5 ? 'Hoch' : rate >= 1 ? 'Gut' : 'Niedrig';
  const statusColor = rate >= 5 ? 'text-green-400 bg-green-500/20' : rate >= 1 ? 'text-yellow-400 bg-yellow-500/20' : 'text-red-400 bg-red-500/20';
  const rateColor = rate >= 5 ? 'text-green-400' : rate >= 1 ? 'text-[#84cc16]' : 'text-red-400';
  const rateChange = prevRate ? ((rate - prevRate) / prevRate * 100) : 22.1;
  const gaugePosition = Math.min(rate * 10, 100);
  
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-400 text-sm flex items-center gap-2">
          <span className="text-lg">👍</span>
          <span className="uppercase tracking-wider">Engagement Rate</span>
        </h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColor}`}>
            {status}
          </span>
          <span className="text-green-400 text-xs">↑{rateChange.toFixed(1)}%</span>
        </div>
      </div>
      
      <div className={`text-5xl font-bold ${rateColor} mb-4`}>{rate.toFixed(2)}%</div>
      
      {/* Gauge mit rotem Punkt wenn niedrig */}
      <div className="relative h-2 bg-[#262626] rounded-full mb-2">
        <div 
          className="absolute h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
          style={{ width: '100%' }}
        ></div>
        {/* Roter Punkt auf der Gauge */}
        <div 
          className={`absolute w-3 h-3 rounded-full -top-0.5 ${rate < 1 ? 'bg-red-500' : rate < 5 ? 'bg-yellow-500' : 'bg-green-500'}`}
          style={{ left: `calc(${gaugePosition}% - 6px)` }}
        ></div>
      </div>
      <div className="flex justify-between text-xs text-gray-500 mb-4">
        <span>0%</span>
        <span>5%</span>
        <span>10%+</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#262626]">
        <div>
          <p className="text-gray-500 text-xs">Interaktionen</p>
          <p className="text-lg font-bold text-white">{formatNumberRaw(interactions)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Reichweite</p>
          <p className="text-lg font-bold text-white">{formatNumberRaw(reach)}</p>
        </div>
      </div>
      <p className="text-gray-600 text-xs mt-3">Berechnung: Interaktionen ÷ Reichweite × 100</p>
    </div>
  );
}

// Goal Progress Card - exakt wie im alten Dashboard
function GoalProgressCard({ title, current, goal }: { 
  title: string; 
  current: number; 
  goal: number;
}) {
  const percentage = Math.min((current / goal) * 100, 100);
  
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-xs uppercase tracking-wider">{title}</span>
        <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#84cc16]/20 text-[#84cc16]">
          {percentage.toFixed(0)}%
        </span>
      </div>
      <div className="text-4xl font-bold text-white mb-1">{formatNumberRaw(current)}</div>
      <p className="text-gray-500 text-xs mb-3">von {formatNumberRaw(goal)}</p>
      <div className="h-2 bg-[#262626] rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full bg-[#84cc16]"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <p className="text-gray-600 text-xs mt-2">Monatliches Ziel</p>
    </div>
  );
}

// Formatiere Datum
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function formatPercent(num: number): string {
  return num.toFixed(2) + '%';
}

type SortOption = 'interactions' | 'engagement' | 'reach';

// Top 5 Posts Chart - mit Sortierauswahl (Interaktionen, Engagement-Rate, Reichweite)
function Top5PostsChart({ posts, platform, totalPosts }: { posts: Post[]; platform: 'facebook' | 'instagram'; totalPosts: number }) {
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

// API Limitations Card
function APILimitationsCard() {
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="text-yellow-500 font-bold mb-2">Facebook API Einschränkungen</h3>
          <div className="text-sm text-gray-400 space-y-1">
            <p><span className="text-white font-medium">Shares:</span> Nicht für alle Posts verfügbar, daher separat ausgewiesen und nicht in Interaktionen enthalten.</p>
            <p><span className="text-white font-medium">Saves:</span> Nicht über die Graph API abrufbar und werden nicht angezeigt.</p>
            <p><span className="text-white font-medium">Organisch vs. Paid:</span> Nur über Ads API verfügbar (nicht implementiert).</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Platform Details Card - mit farbigen Zahlen wie im alten Dashboard
function PlatformDetailsCard({ platform, followers, reactions, comments, reach, saves }: {
  platform: 'facebook' | 'instagram';
  followers: number;
  reactions: number;
  comments: number;
  reach?: number;
  saves?: number;
}) {
  const icon = platform === 'facebook' ? '📘' : '📸';
  const title = platform === 'facebook' ? 'Facebook Details' : 'Instagram Details';
  const followerColor = platform === 'facebook' ? 'text-blue-400' : 'text-pink-400';
  
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="text-white font-bold">{title}</h3>
          <p className="text-gray-500 text-xs">Detaillierte Metriken</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1a1a1a] rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Follower</p>
          <p className={`text-xl font-bold ${followerColor}`}>{formatNumberRaw(followers)}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">{platform === 'facebook' ? 'Reactions' : 'Likes'}</p>
          <p className="text-xl font-bold text-white">{formatNumberRaw(reactions)}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Comments</p>
          <p className="text-xl font-bold text-white">{formatNumberRaw(comments)}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">{platform === 'facebook' ? 'Reichweite' : 'Saves'}</p>
          <p className="text-xl font-bold text-white">{formatNumberRaw(platform === 'facebook' ? (reach || 0) : (saves || 0))}</p>
        </div>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 7);
  });
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [stats, setStats] = useState<Stats | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [fbPosts, setFbPosts] = useState<Post[]>([]);
  const [igPosts, setIgPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const monthOptions = getMonthOptions();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch customers
        const customersRes = await fetch('/api/customers');
        if (customersRes.ok) {
          const customersData = await customersRes.json();
          setCustomers(customersData);
        }

        // Fetch stats
        const customerParam = selectedCustomer !== 'all' ? `&customer=${selectedCustomer}` : '';
        const statsRes = await fetch(`/api/stats?month=${selectedMonth}${customerParam}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        // Fetch Facebook posts
        const fbRes = await fetch(`/api/facebook/posts?month=${selectedMonth}${customerParam}`);
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          setFbPosts(fbData.posts || []);
        }

        // Fetch Instagram posts
        const igRes = await fetch(`/api/instagram/posts?month=${selectedMonth}${customerParam}`);
        if (igRes.ok) {
          const igData = await igRes.json();
          setIgPosts(igData.posts || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      setLoading(false);
    }

    fetchData();
  }, [selectedMonth, selectedCustomer]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Lade Daten...</div>
      </div>
    );
  }

  const totalInteractions = stats ? (stats.fbReactions + stats.fbComments + stats.igLikes + stats.igComments) : 0;
  const totalReach = stats ? (stats.fbReach + stats.igReach) : 0;
  const fbInteractions = stats ? (stats.fbReactions + stats.fbComments) : 0;
  const igInteractions = stats ? (stats.igLikes + stats.igComments) : 0;

  // Calculate percent changes
  const followerChange = stats?.prevTotalFollowers ? getPercentChange(stats.totalFollowers, stats.prevTotalFollowers) : undefined;
  const reachChange = stats?.prevTotalReach ? getPercentChange(totalReach, stats.prevTotalReach) : undefined;
  const interactionsChange = stats?.prevTotalInteractions ? getPercentChange(totalInteractions, stats.prevTotalInteractions) : undefined;
  const postsChange = stats?.prevTotalPosts ? getPercentChange(stats.totalPosts, stats.prevTotalPosts) : undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Dashboard Overview
          </h1>
          <p className="text-gray-400">Facebook & Instagram Performance Metriken</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="bg-[#141414] border border-[#262626] text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#84cc16]"
          >
            <option value="all">Alle Kunden</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.slug}>
                {customer.name}
              </option>
            ))}
          </select>
          
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-[#141414] border border-[#262626] text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#84cc16]"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <button className="bg-[#84cc16] text-black font-medium px-4 py-2 rounded-lg text-sm hover:bg-[#65a30d] transition-colors flex items-center gap-2">
            <span>📄</span> Report erstellen
          </button>
        </div>
      </div>

      {/* KPI Cards - mit farbigen Rahmen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Follower Gesamt" 
          value={stats?.totalFollowers || 0} 
          emoji="👥" 
          change={followerChange}
          accentColor="gray"
        />
        <KPICard 
          title="Reichweite" 
          value={totalReach} 
          emoji="👁" 
          change={reachChange}
          accentColor="yellow"
        />
        <KPICard 
          title="Interaktionen" 
          value={totalInteractions} 
          emoji="💬" 
          change={interactionsChange}
          accentColor="green"
        />
        <KPICard 
          title="Beiträge" 
          value={stats?.totalPosts || 0} 
          emoji="📝" 
          change={postsChange}
          accentColor="red"
        />
      </div>

      {/* Interaction Compare + Engagement Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <InteractionCompareCard
          title="Facebook Interaktionen"
          platform="facebook"
          current={fbInteractions}
          previous={stats?.prevFbInteractions || 0}
          currentLabel="01/2026"
          prevLabel="12/2025"
        />
        <InteractionCompareCard
          title="Instagram Interaktionen"
          platform="instagram"
          current={igInteractions}
          previous={stats?.prevIgInteractions || 0}
          currentLabel="01/2026"
          prevLabel="12/2025"
        />
        <EngagementRateCard
          interactions={totalInteractions}
          reach={totalReach}
        />
      </div>

      {/* Goal Progress Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GoalProgressCard
          title="Reichweiten-Ziel"
          current={totalReach}
          goal={Math.round(totalReach * 1.2)}
        />
        <GoalProgressCard
          title="Interaktions-Ziel"
          current={totalInteractions}
          goal={Math.round(totalInteractions * 1.2)}
        />
        <GoalProgressCard
          title="Beitrags-Ziel"
          current={stats?.totalPosts || 0}
          goal={Math.round((stats?.totalPosts || 0) * 1.2)}
        />
      </div>

      {/* Top 5 Posts Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Top5PostsChart posts={fbPosts} platform="facebook" totalPosts={stats?.fbPosts || 0} />
        <Top5PostsChart posts={igPosts} platform="instagram" totalPosts={stats?.igPosts || 0} />
      </div>

      {/* API Limitations */}
      <APILimitationsCard />

      {/* Platform Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PlatformDetailsCard
          platform="facebook"
          followers={stats?.fbFollowers || 0}
          reactions={stats?.fbReactions || 0}
          comments={stats?.fbComments || 0}
          reach={stats?.fbReach || 0}
        />
        <PlatformDetailsCard
          platform="instagram"
          followers={stats?.igFollowers || 0}
          reactions={stats?.igLikes || 0}
          comments={stats?.igComments || 0}
          saves={stats?.igSaves || 0}
        />
      </div>
    </div>
  );
}
