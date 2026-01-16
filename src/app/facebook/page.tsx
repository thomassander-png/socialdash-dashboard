'use client';

import { useState, useEffect } from 'react';
import { Users, Eye, MessageCircle, Heart, Share2 } from 'lucide-react';

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
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString('de-DE');
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

export default function FacebookPage() {
  const [stats, setStats] = useState<Stats | null>(null);
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
    
    fetch(`/api/stats?${params}`)
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedMonth, selectedCustomer]);

  const monthOptions = getMonthOptions();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-2xl">📘</span> Facebook Analytics
          </h1>
          <p className="text-gray-500 mt-1">Performance Metriken für Facebook</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="bg-[#1f1f1f] text-white border border-[#262626] rounded-lg px-4 py-2"
          >
            <option value="all">Alle Kunden</option>
            {customers.map(c => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
          
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-[#1f1f1f] text-white border border-[#262626] rounded-lg px-4 py-2"
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
          <div className="grid grid-cols-5 gap-4 mb-8">
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-sm uppercase tracking-wider">Follower</span>
                <Users className="text-blue-500" size={20} />
              </div>
              <div className="text-3xl font-bold text-white">{formatNumber(stats.fbFollowers)}</div>
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-sm uppercase tracking-wider">Reactions</span>
                <Heart className="text-red-500" size={20} />
              </div>
              <div className="text-3xl font-bold text-white">{formatNumber(stats.fbReactions)}</div>
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-sm uppercase tracking-wider">Comments</span>
                <MessageCircle className="text-green-500" size={20} />
              </div>
              <div className="text-3xl font-bold text-white">{formatNumber(stats.fbComments)}</div>
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-sm uppercase tracking-wider">Reichweite</span>
                <Eye className="text-purple-500" size={20} />
              </div>
              <div className="text-3xl font-bold text-white">{formatNumber(stats.fbReach)}</div>
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-sm uppercase tracking-wider">Posts</span>
                <Share2 className="text-yellow-500" size={20} />
              </div>
              <div className="text-3xl font-bold text-white">{formatNumber(stats.fbPosts)}</div>
            </div>
          </div>

          {/* API Limitations Notice */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-yellow-500 text-xl">⚠️</span>
              <div>
                <h3 className="font-bold text-yellow-500 mb-1">Facebook API Einschränkungen</h3>
                <ul className="text-gray-400 text-sm space-y-1">
                  <li><strong>Shares:</strong> Nicht für alle Posts verfügbar, daher separat ausgewiesen.</li>
                  <li><strong>Saves:</strong> Nicht über die Graph API abrufbar.</li>
                  <li><strong>Organisch vs. Paid:</strong> Nur über Ads API verfügbar (nicht implementiert).</li>
                </ul>
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
