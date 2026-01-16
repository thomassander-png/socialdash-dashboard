'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import Top5PostsChart from '@/components/Top5PostsChart';
import TopPostsList from '@/components/TopPostsList';
import PostsTable from '@/components/PostsTable';

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

// KPI Card - exakt wie im alten Dashboard
function KPICard({ title, value, emoji, change }: { 
  title: string; 
  value: number; 
  emoji: string;
  change?: number;
}) {
  const hasChange = change !== undefined && change !== null;
  const isPositive = hasChange && change >= 0;
  
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-xs uppercase tracking-wider font-medium">{title}</span>
        <div className="flex items-center gap-2">
          {hasChange && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
            </span>
          )}
          <span className="text-lg">{emoji}</span>
        </div>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{formatNumberRaw(value)}</div>
      <p className="text-gray-500 text-xs">vs. Vormonat</p>
    </div>
  );
}

// Interaction Compare Card - exakt wie im alten Dashboard
function InteractionCompareCard({ title, current, previous, currentLabel, prevLabel }: {
  title: string;
  current: number;
  previous: number;
  currentLabel: string;
  prevLabel: string;
}) {
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
      <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-4">{title}</h3>
      <div className="flex justify-between items-end">
        <div>
          <p className="text-gray-500 text-xs mb-1">{currentLabel}</p>
          <p className="text-3xl font-bold text-blue-400">{formatNumberRaw(current)}</p>
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
function EngagementRateCard({ interactions, reach }: { interactions: number; reach: number }) {
  const rate = reach > 0 ? (interactions / reach) * 100 : 0;
  const status = rate >= 5 ? 'Hoch' : rate >= 1 ? 'Gut' : 'Niedrig';
  const statusColor = rate >= 5 ? 'text-green-400 bg-green-500/20' : rate >= 1 ? 'text-green-400 bg-green-500/20' : 'text-red-400 bg-red-500/20';
  const rateChange = 22.1; // Placeholder
  
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

export default function FacebookPage() {
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
        setPosts(Array.isArray(postsData) ? postsData : []);
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📘</span>
          <div>
            <h1 className="text-3xl font-bold text-white">Facebook Analytics</h1>
            <p className="text-gray-500 mt-1">Performance Metriken und Post-Übersicht</p>
          </div>
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

      {/* Management Summary Button */}
      <div className="mb-6">
        <button className="bg-[#84cc16]/20 border border-[#84cc16] text-[#84cc16] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#84cc16]/30 transition-colors">
          <span>📄</span>
          Management Summary
        </button>
        <p className="text-gray-500 text-sm mt-1">Wählen Sie einen Kunden für den Management Report</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#84cc16]"></div>
        </div>
      ) : stats ? (
        <>
          {/* KPI Cards - 5 in einer Reihe */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <KPICard 
              title="Follower" 
              value={stats.fbFollowers} 
              emoji="👥"
              change={stats.prevFbFollowers ? getPercentChange(stats.fbFollowers, stats.prevFbFollowers) : undefined}
            />
            <KPICard 
              title="Posts" 
              value={stats.fbPosts} 
              emoji="📝"
              change={stats.prevFbPosts ? getPercentChange(stats.fbPosts, stats.prevFbPosts) : undefined}
            />
            <KPICard 
              title="Reactions" 
              value={stats.fbReactions} 
              emoji="👍"
              change={stats.prevFbReactions ? getPercentChange(stats.fbReactions, stats.prevFbReactions) : undefined}
            />
            <KPICard 
              title="Comments" 
              value={stats.fbComments} 
              emoji="💬"
              change={stats.prevFbComments ? getPercentChange(stats.fbComments, stats.prevFbComments) : undefined}
            />
            <KPICard 
              title="Reichweite" 
              value={stats.fbReach} 
              emoji="👁"
              change={stats.prevFbReach ? getPercentChange(stats.fbReach, stats.prevFbReach) : undefined}
            />
          </div>

          {/* Comparison Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <InteractionCompareCard
              title="Interaktionen"
              current={interactions}
              previous={prevInteractions}
              currentLabel={currentMonthLabel}
              prevLabel={prevMonthLabel}
            />
            <InteractionCompareCard
              title="Reichweite"
              current={stats.fbReach}
              previous={stats.prevFbReach || 0}
              currentLabel={currentMonthLabel}
              prevLabel={prevMonthLabel}
            />
            <EngagementRateCard 
              interactions={interactions} 
              reach={stats.fbReach} 
            />
          </div>

          {/* Top 5 Posts Section */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <Top5PostsChart 
              posts={posts} 
              platform="facebook" 
              totalPosts={posts.length}
            />
            <TopPostsList 
              posts={posts} 
              platform="facebook"
            />
          </div>

          {/* Posts Table */}
          <div className="mb-6">
            <PostsTable posts={posts} platform="facebook" />
          </div>

          {/* API Limitations Notice */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-yellow-500 flex-shrink-0" size={24} />
              <div>
                <h3 className="font-bold text-yellow-500 mb-2">Facebook API Einschränkungen</h3>
                <div className="space-y-1 text-sm">
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
