'use client';

import { useState, useEffect } from 'react';
import { Users, Eye, MessageCircle, FileText, TrendingUp, AlertTriangle } from 'lucide-react';

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

function KPICard({ title, value, icon: Icon, change, iconBg }: { 
  title: string; 
  value: number; 
  icon: React.ElementType;
  change?: number;
  iconBg?: string;
}) {
  const isPositive = change !== undefined && change >= 0;
  
  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] rounded-xl p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-[#84cc16]/5 rounded-full -mr-10 -mt-10"></div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-xs uppercase tracking-wider font-medium">{title}</span>
        {change !== undefined && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-3xl font-bold text-[#eab308]">{formatNumber(value)}</div>
        <div className={`p-2 rounded-lg ${iconBg || 'bg-[#84cc16]/10'}`}>
          <Icon className="text-[#84cc16]" size={24} />
        </div>
      </div>
      {change !== undefined && (
        <p className="text-gray-500 text-xs mt-2">vs. Vormonat</p>
      )}
    </div>
  );
}

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
          <p className="text-gray-500 text-xs">{currentLabel}</p>
          <p className={`text-3xl font-bold ${color}`}>{formatNumber(current)}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 text-xs">{prevLabel}</p>
          <p className="text-2xl font-bold text-gray-400">{formatNumber(previous)}</p>
        </div>
      </div>
    </div>
  );
}

function EngagementRateCard({ interactions, reach }: { interactions: number; reach: number }) {
  const rate = reach > 0 ? (interactions / reach) * 100 : 0;
  const status = rate >= 5 ? 'Hoch' : rate >= 1 ? 'Mittel' : 'Niedrig';
  const statusColor = rate >= 5 ? 'text-green-400 bg-green-500/20' : rate >= 1 ? 'text-yellow-400 bg-yellow-500/20' : 'text-red-400 bg-red-500/20';
  
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-400 text-sm uppercase tracking-wider flex items-center gap-2">
          📉 Engagement Rate
        </h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColor}`}>
          {status}
        </span>
      </div>
      
      <div className="text-4xl font-bold text-[#84cc16] mb-4">{rate.toFixed(2)}%</div>
      
      <div className="relative h-2 bg-[#262626] rounded-full mb-4">
        <div 
          className="absolute h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
          style={{ width: `${Math.min(rate * 10, 100)}%` }}
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
          <p className="text-lg font-bold text-white">{formatNumber(interactions)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Reichweite</p>
          <p className="text-lg font-bold text-white">{formatNumber(reach)}</p>
        </div>
      </div>
      <p className="text-gray-600 text-xs mt-3">Berechnung: Interaktionen ÷ Reichweite × 100</p>
    </div>
  );
}

function GoalProgressCard({ title, current, goal, color }: { 
  title: string; 
  current: number; 
  goal: number;
  color: string;
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
      <div className="text-3xl font-bold text-white mb-1">{formatNumber(current)}</div>
      <p className="text-gray-500 text-xs mb-3">von {formatNumber(goal)}</p>
      <div className="h-2 bg-[#262626] rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        ></div>
      </div>
      <p className="text-gray-600 text-xs mt-2">Monatliches Ziel</p>
    </div>
  );
}

function Top5PostsChart({ posts, platform, totalPosts }: { posts: Post[]; platform: 'facebook' | 'instagram'; totalPosts: number }) {
  const barColor = platform === 'facebook' ? 'bg-blue-500' : 'bg-pink-500';
  const title = platform === 'facebook' ? 'Top 5 Facebook Posts' : 'Top 5 Instagram Posts';
  
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-bold text-lg">{title}</h3>
          <p className="text-gray-500 text-sm">Nach Interaktionen sortiert</p>
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
        <div className="flex items-end justify-between gap-2 h-48">
          {topPosts.map((post, index) => {
            const heightPercent = (post.interactions / maxInteractions) * 100;
            return (
              <div key={post.post_id} className="flex-1 flex flex-col items-center">
                <span className="text-white text-sm font-bold mb-1">
                  {formatNumber(post.interactions)}
                </span>
                <div className="w-10 h-10 mb-1 rounded overflow-hidden bg-[#262626] flex-shrink-0">
                  {post.thumbnail_url ? (
                    <img 
                      src={post.thumbnail_url} 
                      alt={`Post ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                      {platform === 'facebook' ? '📘' : '📸'}
                    </div>
                  )}
                </div>
                <div 
                  className={`w-full ${barColor} rounded-t transition-all duration-500`}
                  style={{ height: `${Math.max(heightPercent, 10)}%` }}
                ></div>
                <span className="text-gray-500 text-xs mt-2">Post {index + 1}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
        <div className="bg-[#1a1a1a] rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase">Follower</p>
          <p className={`text-2xl font-bold ${accentColor}`}>{formatNumber(data.followers)}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase">{data.metric1Label}</p>
          <p className="text-2xl font-bold text-white">{formatNumber(data.metric1)}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase">{data.metric2Label}</p>
          <p className="text-2xl font-bold text-white">{formatNumber(data.metric2)}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase">{data.metric3Label}</p>
          <p className="text-2xl font-bold text-white">{formatNumber(data.metric3)}</p>
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            📊 Dashboard Overview
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
            <FileText size={18} />
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
          <div className="grid grid-cols-4 gap-4 mb-6">
            <KPICard 
              title="Follower Gesamt" 
              value={stats.totalFollowers} 
              icon={Users}
              change={stats.prevTotalFollowers ? getPercentChange(stats.totalFollowers, stats.prevTotalFollowers) : undefined}
            />
            <KPICard 
              title="Reichweite" 
              value={stats.totalReach} 
              icon={Eye}
              change={stats.prevTotalReach ? getPercentChange(stats.totalReach, stats.prevTotalReach) : undefined}
            />
            <KPICard 
              title="Interaktionen" 
              value={stats.totalInteractions} 
              icon={MessageCircle}
              change={stats.prevTotalInteractions ? getPercentChange(stats.totalInteractions, stats.prevTotalInteractions) : undefined}
            />
            <KPICard 
              title="Beiträge" 
              value={stats.totalPosts} 
              icon={FileText}
              change={stats.prevTotalPosts ? getPercentChange(stats.totalPosts, stats.prevTotalPosts) : undefined}
            />
          </div>

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

          <div className="grid grid-cols-3 gap-4 mb-6">
            <GoalProgressCard
              title="Reichweiten-Ziel"
              current={stats.totalReach}
              goal={reachGoal}
              color="#84cc16"
            />
            <GoalProgressCard
              title="Interaktions-Ziel"
              current={stats.totalInteractions}
              goal={interactionGoal}
              color="#eab308"
            />
            <GoalProgressCard
              title="Beitrags-Ziel"
              current={stats.totalPosts}
              goal={postsGoal}
              color="#84cc16"
            />
          </div>

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

          <div className="mb-6">
            <APILimitationsCard />
          </div>

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
