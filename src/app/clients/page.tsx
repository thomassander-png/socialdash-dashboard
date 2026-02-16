'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import {
  Users, TrendingUp, TrendingDown, Facebook, Instagram,
  Megaphone, Eye, MousePointerClick, ArrowLeft, Search,
  ChevronDown, ChevronUp, BarChart3, DollarSign
} from 'lucide-react';

interface CustomerOverview {
  customer_id: string;
  name: string;
  slug: string;
  fb: {
    followers: number;
    prevFollowers: number;
    followerNetto: number;
    hasPrevData: boolean;
    posts: number;
    reactions: number;
    comments: number;
    shares: number;
    reach: number;
    impressions: number;
    videoViews: number;
    prevPosts: number;
    prevReach: number;
    prevImpressions: number;
  };
  ig: {
    followers: number;
    prevFollowers: number;
    followerNetto: number;
    hasPrevData: boolean;
    posts: number;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
    reach: number;
    impressions: number;
    plays: number;
    prevPosts: number;
    prevReach: number;
    prevImpressions: number;
  };
  ads: {
    spend: number;
    impressions: number;
    clicks: number;
    reach: number;
    cpc: number;
    ctr: number;
    cpm: number;
    campaigns: number;
    accounts: number;
  };
  totals: {
    followers: number;
    prevFollowers: number;
    followerNetto: number;
    posts: number;
    reach: number;
    impressions: number;
    interactions: number;
    adSpend: number;
  };
}

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString('de-DE');
}

function formatCurrency(num: number): string {
  return num.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  return options;
}

function NettoIndicator({ value, hasPrevData }: { value: number; hasPrevData: boolean }) {
  if (!hasPrevData) return <span className="text-gray-600 text-xs">–</span>;
  const isPositive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
      {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {isPositive ? '+' : ''}{formatNumber(value)}
    </span>
  );
}

function StatBox({ label, value, icon, subLabel, className = '' }: {
  label: string; value: string; icon?: React.ReactNode; subLabel?: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-[#1a1a1a] rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-500 text-xs uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      {subLabel && <div className="mt-1">{subLabel}</div>}
    </div>
  );
}

// Customer Card for the overview grid
function CustomerCard({ customer, onClick }: { customer: CustomerOverview; onClick: () => void }) {
  const hasFb = customer.fb.posts > 0 || customer.fb.followers > 0;
  const hasIg = customer.ig.posts > 0 || customer.ig.followers > 0;
  const hasAds = customer.ads.spend > 0;

  return (
    <div
      onClick={onClick}
      className="bg-[#141414] border border-[#262626] rounded-xl p-5 hover:border-[#84cc16]/50 hover:bg-[#1a1a1a] transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white group-hover:text-[#84cc16] transition-colors truncate">
          {customer.name}
        </h3>
        <div className="flex gap-1.5">
          {hasFb && <span className="w-2 h-2 rounded-full bg-blue-500" title="Facebook" />}
          {hasIg && <span className="w-2 h-2 rounded-full bg-pink-500" title="Instagram" />}
          {hasAds && <span className="w-2 h-2 rounded-full bg-amber-500" title="Ads" />}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <span className="text-gray-500 text-xs">Follower</span>
          <div className="text-white font-semibold">{formatNumber(customer.totals.followers)}</div>
          <NettoIndicator
            value={customer.totals.followerNetto}
            hasPrevData={customer.fb.hasPrevData || customer.ig.hasPrevData}
          />
        </div>
        <div>
          <span className="text-gray-500 text-xs">Posts</span>
          <div className="text-white font-semibold">{customer.totals.posts}</div>
        </div>
        <div>
          <span className="text-gray-500 text-xs">Reichweite</span>
          <div className="text-white font-semibold">{formatNumber(customer.totals.reach)}</div>
        </div>
        <div>
          <span className="text-gray-500 text-xs">Interaktionen</span>
          <div className="text-white font-semibold">{formatNumber(customer.totals.interactions)}</div>
        </div>
      </div>

      {/* Ads row */}
      {hasAds && (
        <div className="border-t border-[#262626] pt-3 mt-1">
          <div className="flex items-center justify-between">
            <span className="text-amber-500 text-xs font-medium flex items-center gap-1">
              <DollarSign size={12} /> Ad Spend
            </span>
            <span className="text-white font-semibold text-sm">{formatCurrency(customer.ads.spend)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Customer Detail View
function CustomerDetail({ customer, onBack }: { customer: CustomerOverview; onBack: () => void }) {
  const hasFb = customer.fb.posts > 0 || customer.fb.followers > 0;
  const hasIg = customer.ig.posts > 0 || customer.ig.followers > 0;
  const hasAds = customer.ads.spend > 0;

  return (
    <div>
      {/* Back button + header */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
      >
        <ArrowLeft size={18} />
        <span>Zurück zur Übersicht</span>
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">{customer.name}</h1>
        <div className="flex gap-2">
          {hasFb && <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">Facebook</span>}
          {hasIg && <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-400 text-xs font-medium">Instagram</span>}
          {hasAds && <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">Ads</span>}
        </div>
      </div>

      {/* Total KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatBox
          label="Follower Gesamt"
          value={formatNumber(customer.totals.followers)}
          icon={<Users className="text-[#84cc16]" size={18} />}
          subLabel={<NettoIndicator value={customer.totals.followerNetto} hasPrevData={customer.fb.hasPrevData || customer.ig.hasPrevData} />}
        />
        <StatBox
          label="Posts Gesamt"
          value={String(customer.totals.posts)}
          icon={<BarChart3 className="text-[#84cc16]" size={18} />}
        />
        <StatBox
          label="Reichweite Gesamt"
          value={formatNumber(customer.totals.reach)}
          icon={<Eye className="text-[#84cc16]" size={18} />}
        />
        <StatBox
          label="Interaktionen"
          value={formatNumber(customer.totals.interactions)}
          icon={<MousePointerClick className="text-[#84cc16]" size={18} />}
        />
      </div>

      {/* Facebook Section */}
      {hasFb && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-5">
            <Facebook className="text-blue-500" size={22} />
            Facebook
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox
              label="Follower"
              value={formatNumber(customer.fb.followers)}
              subLabel={<NettoIndicator value={customer.fb.followerNetto} hasPrevData={customer.fb.hasPrevData} />}
            />
            <StatBox label="Posts" value={String(customer.fb.posts)} />
            <StatBox label="Reichweite" value={formatNumber(customer.fb.reach)} />
            <StatBox label="Impressionen" value={formatNumber(customer.fb.impressions)} />
            <StatBox label="Reaktionen" value={formatNumber(customer.fb.reactions)} />
            <StatBox label="Kommentare" value={formatNumber(customer.fb.comments)} />
            <StatBox label="Shares" value={formatNumber(customer.fb.shares)} />
            <StatBox label="Video Views" value={formatNumber(customer.fb.videoViews)} />
          </div>
        </div>
      )}

      {/* Instagram Section */}
      {hasIg && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-5">
            <Instagram className="text-pink-500" size={22} />
            Instagram
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox
              label="Follower"
              value={formatNumber(customer.ig.followers)}
              subLabel={<NettoIndicator value={customer.ig.followerNetto} hasPrevData={customer.ig.hasPrevData} />}
            />
            <StatBox label="Posts" value={String(customer.ig.posts)} />
            <StatBox label="Reichweite" value={formatNumber(customer.ig.reach)} />
            <StatBox label="Impressionen" value={formatNumber(customer.ig.impressions)} />
            <StatBox label="Likes" value={formatNumber(customer.ig.likes)} />
            <StatBox label="Kommentare" value={formatNumber(customer.ig.comments)} />
            <StatBox label="Saves" value={formatNumber(customer.ig.saves)} />
            <StatBox label="Shares" value={formatNumber(customer.ig.shares)} />
          </div>
        </div>
      )}

      {/* Ads Section */}
      {hasAds && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-5">
            <Megaphone className="text-amber-500" size={22} />
            Paid Ads
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox
              label="Ausgaben"
              value={formatCurrency(customer.ads.spend)}
              icon={<DollarSign className="text-amber-500" size={16} />}
              className="border border-amber-500/20"
            />
            <StatBox label="Impressionen" value={formatNumber(customer.ads.impressions)} />
            <StatBox label="Klicks" value={formatNumber(customer.ads.clicks)} />
            <StatBox label="Reichweite" value={formatNumber(customer.ads.reach)} />
            <StatBox label="CPC" value={formatCurrency(customer.ads.cpc)} />
            <StatBox label="CPM" value={formatCurrency(customer.ads.cpm)} />
            <StatBox label="CTR" value={customer.ads.ctr.toFixed(2) + '%'} />
            <StatBox label="Kampagnen" value={String(customer.ads.campaigns)} />
          </div>
        </div>
      )}

      {/* No data message */}
      {!hasFb && !hasIg && !hasAds && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-12 text-center">
          <p className="text-gray-500">Keine Daten für diesen Zeitraum vorhanden.</p>
        </div>
      )}
    </div>
  );
}

function ClientsContent() {
  const [data, setData] = useState<CustomerOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'followers' | 'reach' | 'spend'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const monthOptions = useMemo(() => getMonthOptions(), []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/customer-overview?month=${month}`)
      .then(res => {
        if (!res.ok) throw new Error('Fehler beim Laden');
        return res.json();
      })
      .then(result => {
        setData(result.customers || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [month]);

  // Filter and sort
  const filteredData = useMemo(() => {
    let filtered = data.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'followers': cmp = a.totals.followers - b.totals.followers; break;
        case 'reach': cmp = a.totals.reach - b.totals.reach; break;
        case 'spend': cmp = a.ads.spend - b.ads.spend; break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return filtered;
  }, [data, search, sortBy, sortDir]);

  const selectedData = useMemo(() =>
    data.find(c => c.slug === selectedCustomer),
    [data, selectedCustomer]
  );

  // Totals across all customers
  const grandTotals = useMemo(() => ({
    followers: data.reduce((s, c) => s + c.totals.followers, 0),
    followerNetto: data.reduce((s, c) => s + c.totals.followerNetto, 0),
    posts: data.reduce((s, c) => s + c.totals.posts, 0),
    reach: data.reduce((s, c) => s + c.totals.reach, 0),
    interactions: data.reduce((s, c) => s + c.totals.interactions, 0),
    adSpend: data.reduce((s, c) => s + c.ads.spend, 0),
  }), [data]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  };

  const SortButton = ({ field, label }: { field: typeof sortBy; label: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
        sortBy === field
          ? 'bg-[#84cc16]/20 text-[#84cc16]'
          : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
      }`}
    >
      {label}
      {sortBy === field && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
    </button>
  );

  if (selectedData) {
    return <CustomerDetail customer={selectedData} onBack={() => setSelectedCustomer(null)} />;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="text-[#84cc16]" size={32} />
            Kunden-Übersicht
          </h1>
          <p className="text-gray-500 mt-1">Facebook, Instagram &amp; Ads – alle Daten pro Kunde</p>
        </div>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="bg-[#1f1f1f] text-white border border-[#262626] rounded-lg px-4 py-2 text-sm"
        >
          {monthOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Grand Totals */}
      {!loading && data.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatBox
            label="Follower Gesamt"
            value={formatNumber(grandTotals.followers)}
            icon={<Users className="text-[#84cc16]" size={16} />}
            subLabel={<NettoIndicator value={grandTotals.followerNetto} hasPrevData={true} />}
          />
          <StatBox label="Posts" value={formatNumber(grandTotals.posts)} icon={<BarChart3 className="text-[#84cc16]" size={16} />} />
          <StatBox label="Reichweite" value={formatNumber(grandTotals.reach)} icon={<Eye className="text-[#84cc16]" size={16} />} />
          <StatBox label="Interaktionen" value={formatNumber(grandTotals.interactions)} icon={<MousePointerClick className="text-[#84cc16]" size={16} />} />
          <StatBox
            label="Ad Spend"
            value={formatCurrency(grandTotals.adSpend)}
            icon={<DollarSign className="text-amber-500" size={16} />}
          />
          <StatBox label="Kunden" value={String(data.length)} icon={<Users className="text-gray-400" size={16} />} />
        </div>
      )}

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="Kunde suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#1f1f1f] text-white border border-[#262626] rounded-lg pl-10 pr-4 py-2 text-sm placeholder:text-gray-600 focus:border-[#84cc16] focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <SortButton field="name" label="Name" />
          <SortButton field="followers" label="Follower" />
          <SortButton field="reach" label="Reichweite" />
          <SortButton field="spend" label="Ad Spend" />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#84cc16]"></div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Customer Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredData.map(customer => (
            <CustomerCard
              key={customer.customer_id}
              customer={customer}
              onClick={() => setSelectedCustomer(customer.slug)}
            />
          ))}
        </div>
      )}

      {/* No results */}
      {!loading && !error && filteredData.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {search ? `Kein Kunde gefunden für "${search}"` : 'Keine Kunden vorhanden.'}
        </div>
      )}
    </div>
  );
}

export default function ClientsPage() {
  return (
    <DashboardLayout>
      <ClientsContent />
    </DashboardLayout>
  );
}
