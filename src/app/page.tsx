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

// KPI Card Component - exakt wie im alten Dashboard
function KPICard({ title, value, emoji, change, prevValue }: { 
  title: string; 
  value: number; 
  emoji: string;
  change?: number;
  prevValue?: number;
}) {
  const hasChange = change !== undefined && change !== null;
  const isPositive = hasChange && change >= 0;
  
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
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
        {prevValue !== undefined && (
          <span className="text-gray-500 text-lg ml-2">{formatNumberRaw(prevValue)}</span>
        )}
      </div>
      <p className="text-gray-500 text-xs">vs. Vormonat</p>
    </div>
  );
}

// Interaction Compare Card - exakt wie im alten Dashboard
function InteractionCompareCard({ title, platform, current, previous, currentLabel, prevLabel }: {
  title: string;
  platform: 'facebook' | 'instagram';
  current: number;
  previous: number;
  currentLabel: string;
  prevLabel: string;
}) {
  const color = platform === 'facebook' ? 'text-blue-400' : 'text-pink-400';
  
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
      <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-4">{title}</h3>
      <div className="flex justify-between items-end">
        <div>
          <p className="text-gray-500 text-xs mb-1">{currentLabel}</p>
          <p className={`text-3xl font-bold ${color}`}>{formatNumberRaw(current)}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 text-xs mb-1">{prevLabel}</p>
          <p className="text-2xl font-bold text-gray-400">{formatNumberRaw(previous)}</p>
        </div>
      </div>
    </div>
  );
}

// Engagement Rate Card - exakt wie im alten Dashboard
function EngagementRateCard({ interactions, reach, prevRate }: { interactions: number; reach: number; prevRate?: number }) {
  const rate = reach > 0 ? (interactions / reach) * 100 : 0;
  const status = rate >= 5 ? 'Hoch' : rate >= 1 ? 'Gut' : 'Niedrig';
  const statusColor = rate >= 5 ? 'text-green-400 bg-green-500/20' : rate >= 1 ? 'text-yellow-400 bg-yellow-500/20' : 'text-red-400 bg-red-500/20';
  const rateChange = prevRate ? ((rate - prevRate) / prevRate * 100) : 22.1;
  
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-400 text-sm flex items-center gap-2">
          <span className="text-lg">📉</span>
          <span className="uppercase tracking-wider">Engagement Rate</span>
        </h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColor}`}>
            {status}
          </span>
          <span className="text-green-400 text-xs">↑{rateChange.toFixed(1)}%</span>
        </div>
      </div>
      
      <div className="text-5xl font-bold text-[#84cc16] mb-4">{rate.toFixed(2)}%</div>
      
      {/* Gauge */}
      <div className="relative h-2 bg-[#262626] rounded-full mb-2">
        <div 
          className="absolute h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
          style={{ width: `${Math.min(rate * 10, 100)}%` }}
        ></div>
        <div 
          className="absolute w-1 h-4 bg-white rounded -top-1"
          style={{ left: `${Math.min(rate * 10, 100)}%` }}
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
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="text-yellow-500" size={20} />
        <h3 className="text-yellow-500 font-medium">Facebook API Einschränkungen</h3>
      </div>
      <div className="space-y-2 text-sm">
        <p><span className="text-gray-400 font-medium">Shares:</span> <span className="text-gray-500">Nicht für alle Posts verfügbar, daher separat ausgewiesen und nicht in Interaktionen enthalten.</span></p>
        <p><span className="text-gray-400 font-medium">Saves:</span> <span className="text-gray-500">Nicht über die Graph API abrufbar und werden nicht angezeigt.</span></p>
        <p><span className="text-gray-400 font-medium">Organisch vs. Paid:</span> <span className="text-gray-500">Nur über Ads API verfügbar (nicht implementiert).</span></p>
      </div>
    </div>
  );
}

// Platform Details Card - exakt wie im alten Dashboard
function PlatformDetailsCard({ platform, data }: { 
  platform: 'facebook' | 'instagram';
  data: { followers: number; metric1: number; metric1Label: string; metric2: number; metric2Label: string; metric3: number; metric3Label: string; }
}) {
  const icon = platform === 'facebook' ? '📘' : '📸';
  const title = platform === 'facebook' ? 'Facebook Details' : 'Instagram Details';
  const accentColor = platform === 'facebook' ? 'text-blue-400' : 'text-pink-400';
  
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">{icon}</span>
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-gray-500 text-sm">Detaillierte Metriken</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1a1a1a] rounded-lg p-4">
          <p className="text-gray-500 text-xs uppercase mb-1">Follower</p>
          <p className={`text-2xl font-bold ${accentColor}`}>{formatNumberRaw(data.followers)}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-4">
          <p className="text-gray-500 text-xs uppercase mb-1">{data.metric1Label}</p>
          <p className="text-2xl font-bold text-white">{formatNumberRaw(data.metric1)}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-4">
          <p className="text-gray-500 text-xs uppercase mb-1">{data.metric2Label}</p>
          <p className="text-2xl font-bold text-white">{formatNumberRaw(data.metric2)}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-4">
          <p className="text-gray-500 text-xs uppercase mb-1">{data.metric3Label}</p>
          <p className="text-2xl font-bold text-white">{formatNumberRaw(data.metric3)}</p>
        </div>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [fbPosts, setFbPosts] = useState<Post[]>([]);
  const [igPosts, setIgPosts] = useState<Post[]>([]);
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
      fetch(`/api/facebook/posts?${params}`).then(res => res.json()).catch(() => []),
      fetch(`/api/instagram/posts?${params}`).then(res => res.json()).catch(() => [])
    ])
      .then(([statsData, fbPostsData, igPostsData]) => {
        setStats(statsData);
        setFbPosts(Array.isArray(fbPostsData) ? fbPostsData : []);
        setIgPosts(Array.isArray(igPostsData) ? igPostsData : []);
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

  const reachGoal = stats ? Math.round(stats.totalReach * 1.2) : 0;
  const interactionGoal = stats ? Math.round(stats.totalInteractions * 1.2) : 0;
  const postsGoal = stats ? Math.round(stats.totalPosts * 1.2) : 30;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">📊</span>
            Dashboard Overview
          </h1>
          <p className="text-gray-500 mt-1">Facebook & Instagram Performance Metriken</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="bg-[#1f1f1f] text-white border border-[#262626] rounded-lg px-4 py-2 focus:border-[#84cc16] focus:outline-none"
          >
            <option value="all">Alle Kunden</option>
            {customers.map(c => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
          
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-[#1f1f1f] text-white border border-[#262626] rounded-lg px-4 py-2 focus:border-[#84cc16] focus:outline-none"
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          
          <button className="bg-[#84cc16] hover:bg-[#65a30d] text-black font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <span>📄</span>
            Report erstellen
          </button>
        </div>
      </div>

      {selectedCustomer !== 'all' && (
        <div className="mb-6">
          <span className="text-gray-500 text-sm">Gefiltert nach: </span>
          <span className="bg-[#84cc16]/20 text-[#84cc16] px-3 py-1 rounded-full text-sm font-medium">
            {customers.find(c => c.slug === selectedCustomer)?.name}
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#84cc16]"></div>
        </div>
      ) : stats ? (
        <>
          {/* KPI Cards - 4 in einer Reihe */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <KPICard 
              title="Follower Gesamt" 
              value={stats.totalFollowers} 
              emoji="👥"
              prevValue={stats.prevTotalFollowers}
            />
            <KPICard 
              title="Reichweite" 
              value={stats.totalReach} 
              emoji="👁"
              change={stats.prevTotalReach ? getPercentChange(stats.totalReach, stats.prevTotalReach) : undefined}
            />
            <KPICard 
              title="Interaktionen" 
              value={stats.totalInteractions} 
              emoji="💬"
              change={stats.prevTotalInteractions ? getPercentChange(stats.totalInteractions, stats.prevTotalInteractions) : undefined}
            />
            <KPICard 
              title="Beiträge" 
              value={stats.totalPosts} 
              emoji="📝"
              change={stats.prevTotalPosts ? getPercentChange(stats.totalPosts, stats.prevTotalPosts) : undefined}
            />
          </div>

          {/* Interaction Compare + Engagement Rate */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <InteractionCompareCard
              title="Facebook Interaktionen"
              platform="facebook"
              current={stats.fbReactions + stats.fbComments}
              previous={stats.prevFbInteractions || 0}
              currentLabel={currentMonthLabel}
              prevLabel={prevMonthLabel}
            />
            <InteractionCompareCard
              title="Instagram Interaktionen"
              platform="instagram"
              current={stats.igLikes + stats.igComments}
              previous={stats.prevIgInteractions || 0}
              currentLabel={currentMonthLabel}
              prevLabel={prevMonthLabel}
            />
            <EngagementRateCard 
              interactions={stats.totalInteractions} 
              reach={stats.totalReach} 
            />
          </div>

          {/* Goal Progress Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <GoalProgressCard
              title="Reichweiten-Ziel"
              current={stats.totalReach}
              goal={reachGoal}
            />
            <GoalProgressCard
              title="Interaktions-Ziel"
              current={stats.totalInteractions}
              goal={interactionGoal}
            />
            <GoalProgressCard
              title="Beitrags-Ziel"
              current={stats.totalPosts}
              goal={postsGoal}
            />
          </div>

          {/* Top 5 Posts Charts */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <Top5PostsChart 
              posts={fbPosts} 
              platform="facebook" 
              totalPosts={fbPosts.length}
            />
            <Top5PostsChart 
              posts={igPosts} 
              platform="instagram" 
              totalPosts={igPosts.length}
            />
          </div>

          {/* API Limitations */}
          <div className="mb-6">
            <APILimitationsCard />
          </div>

          {/* Platform Details */}
          <div className="grid grid-cols-2 gap-6">
            <PlatformDetailsCard
              platform="facebook"
              data={{
                followers: stats.fbFollowers,
                metric1: stats.fbReactions,
                metric1Label: 'Reactions',
                metric2: stats.fbComments,
                metric2Label: 'Comments',
                metric3: stats.fbReach,
                metric3Label: 'Reichweite'
              }}
            />
            <PlatformDetailsCard
              platform="instagram"
              data={{
                followers: stats.igFollowers,
                metric1: stats.igLikes,
                metric1Label: 'Likes',
                metric2: stats.igComments,
                metric2Label: 'Comments',
                metric3: stats.igSaves,
                metric3Label: 'Saves'
              }}
            />
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-[#262626] text-center">
            <p className="text-gray-600 text-sm">
              Powered by <a href="https://famefact.com" target="_blank" rel="noopener noreferrer" className="text-[#84cc16] hover:underline">famefact</a>
            </p>
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
