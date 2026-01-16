'use client';

import { useState, useEffect } from 'react';
import { FileText, AlertTriangle } from 'lucide-react';
import Top5PostsChart from '@/components/Top5PostsChart';
import TopPostsList from '@/components/TopPostsList';
import PostsTable from '@/components/PostsTable';

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

function KPICard({ title, value, icon, change }: { 
  title: string; 
  value: number; 
  icon: string;
  change?: number;
}) {
  const isPositive = change !== undefined && change >= 0;
  
  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] rounded-xl p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 bg-pink-500/5 rounded-full -mr-8 -mt-8"></div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-400 text-xs uppercase tracking-wider font-medium">{title}</span>
        {change !== undefined && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold text-[#eab308]">{formatNumber(value)}</div>
        <span className="text-xl">{icon}</span>
      </div>
      {change !== undefined && (
        <p className="text-gray-500 text-xs mt-1">vs. Vormonat</p>
      )}
    </div>
  );
}

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
          <p className="text-gray-500 text-xs">{currentLabel}</p>
          <p className="text-3xl font-bold text-pink-400">{formatNumber(current)}</p>
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
  const status = rate >= 5 ? 'Hoch' : rate >= 1 ? 'Gut' : 'Niedrig';
  const statusColor = rate >= 5 ? 'text-green-400 bg-green-500/20' : rate >= 1 ? 'text-yellow-400 bg-yellow-500/20' : 'text-red-400 bg-red-500/20';
  
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-400 text-sm uppercase tracking-wider flex items-center gap-2">
          ❤️ Engagement Rate
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

export default function InstagramPage() {
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

  const interactions = stats ? stats.igLikes + stats.igComments : 0;
  const prevInteractions = stats?.prevIgLikes && stats?.prevIgComments 
    ? stats.prevIgLikes + stats.prevIgComments 
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📸</span>
          <div>
            <h1 className="text-3xl font-bold text-white">Instagram Analytics</h1>
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
            <FileText size={18} />
            Report erstellen
          </button>
        </div>
      </div>

      {/* Management Summary Button */}
      <div className="mb-6">
        <button className="bg-[#84cc16]/20 border border-[#84cc16] text-[#84cc16] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#84cc16]/30 transition-colors">
          <FileText size={18} />
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
          {/* KPI Cards */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <KPICard 
              title="Follower" 
              value={stats.igFollowers} 
              icon="👥"
              change={stats.prevIgFollowers ? getPercentChange(stats.igFollowers, stats.prevIgFollowers) : undefined}
            />
            <KPICard 
              title="Posts" 
              value={stats.igPosts} 
              icon="📝"
              change={stats.prevIgPosts ? getPercentChange(stats.igPosts, stats.prevIgPosts) : undefined}
            />
            <KPICard 
              title="Likes" 
              value={stats.igLikes} 
              icon="❤️"
              change={stats.prevIgLikes ? getPercentChange(stats.igLikes, stats.prevIgLikes) : undefined}
            />
            <KPICard 
              title="Comments" 
              value={stats.igComments} 
              icon="💬"
              change={stats.prevIgComments ? getPercentChange(stats.igComments, stats.prevIgComments) : undefined}
            />
            <KPICard 
              title="Saves" 
              value={stats.igSaves} 
              icon="🔖"
              change={stats.prevIgSaves ? getPercentChange(stats.igSaves, stats.prevIgSaves) : undefined}
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
              current={stats.igReach}
              previous={stats.prevIgReach || 0}
              currentLabel={currentMonthLabel}
              prevLabel={prevMonthLabel}
            />
            <EngagementRateCard 
              interactions={interactions} 
              reach={stats.igReach} 
            />
          </div>

          {/* Top 5 Posts Section */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <Top5PostsChart 
              posts={posts} 
              platform="instagram" 
              totalPosts={posts.length}
            />
            <TopPostsList 
              posts={posts} 
              platform="instagram"
            />
          </div>

          {/* Posts Table */}
          <div className="mb-6">
            <PostsTable posts={posts} platform="instagram" />
          </div>

          {/* Instagram Info Notice */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-pink-500 flex-shrink-0" size={24} />
              <div>
                <h3 className="font-bold text-pink-500 mb-2">Instagram API Hinweise</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-400 font-medium">Saves:</span> <span className="text-gray-500">Verfügbar für Business/Creator Accounts über die Instagram Graph API.</span></p>
                  <p><span className="text-gray-400 font-medium">Reichweite:</span> <span className="text-gray-500">Nur für Posts der letzten 2 Jahre verfügbar.</span></p>
                  <p><span className="text-gray-400 font-medium">Stories:</span> <span className="text-gray-500">Insights nur 24 Stunden nach Veröffentlichung verfügbar.</span></p>
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
