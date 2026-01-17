'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Download, Search, Filter, Users, Building2, CheckCircle, XCircle, Info } from 'lucide-react';

interface Customer {
  customer_id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

interface CustomerStats {
  customer_id: string;
  // Facebook
  fb_posts: number;
  fb_reactions: number;
  fb_comments: number;
  fb_shares: number;
  fb_reach: number;
  fb_impressions: number;
  fb_video_views: number;
  fb_interactions: number;
  // Instagram
  ig_posts: number;
  ig_likes: number;
  ig_comments: number;
  ig_saves: number;
  ig_reach: number;
  ig_impressions: number;
  ig_plays: number;
  ig_shares: number;
  ig_profile_visits: number;
  ig_interactions: number;
  // Instagram Account Insights (Klicks)
  ig_profile_clicks: number;
  ig_email_clicks: number;
  ig_call_clicks: number;
}

// Relevante Kunden aus der Excel-Datei
const RELEVANT_CUSTOMERS = [
  'ABDA',
  'Oxford',
  'OE',
  'catella',
  'KAP',
  'Colibri',
  'Asphericon',
  'asphericon',
  'Herlitz',
  'Contipark',
  'CONTIPARK',
  'AND',
  'ANDskincare',
  'Pelikan',
  'reflectives',
  'Reflectives',
  'Fensterart',
  'fensterart',
  'captrain',
  'Captrain',
  'Pro Formula',
  'Vergleich',
];

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

function CustomersContent() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerStats, setCustomerStats] = useState<Record<string, CustomerStats>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyRelevant, setShowOnlyRelevant] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [exporting, setExporting] = useState(false);

  const monthOptions = getMonthOptions();

  // Lade Kunden
  useEffect(() => {
    fetch('/api/customers')
      .then(res => res.json())
      .then(data => {
        setCustomers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading customers:', err);
        setLoading(false);
      });
  }, []);

  // Lade Stats für jeden Kunden
  useEffect(() => {
    if (customers.length === 0) return;

    const loadStats = async () => {
      const stats: Record<string, CustomerStats> = {};
      
      for (const customer of customers) {
        try {
          const res = await fetch(`/api/stats?month=${selectedMonth}&customer=${customer.slug}`);
          const data = await res.json();
          stats[customer.customer_id] = {
            customer_id: customer.customer_id,
            // Facebook
            fb_posts: data.fbPosts || 0,
            fb_reactions: data.fbReactions || 0,
            fb_comments: data.fbComments || 0,
            fb_shares: data.fbShares || 0,
            fb_reach: data.fbReach || 0,
            fb_impressions: data.fbImpressions || 0,
            fb_video_views: data.fbVideoViews || 0,
            fb_interactions: data.fbInteractions || 0,
            // Instagram
            ig_posts: data.igPosts || 0,
            ig_likes: data.igLikes || 0,
            ig_comments: data.igComments || 0,
            ig_saves: data.igSaves || 0,
            ig_reach: data.igReach || 0,
            ig_impressions: data.igImpressions || 0,
            ig_plays: data.igPlays || 0,
            ig_shares: data.igShares || 0,
            ig_profile_visits: data.igProfileVisits || 0,
            ig_interactions: data.igInteractions || 0,
            // Instagram Account Insights
            ig_profile_clicks: data.igProfileClicks || 0,
            ig_email_clicks: data.igEmailClicks || 0,
            ig_call_clicks: data.igCallClicks || 0,
          };
        } catch (err) {
          console.error(`Error loading stats for ${customer.name}:`, err);
        }
      }
      
      setCustomerStats(stats);
    };

    loadStats();
  }, [customers, selectedMonth]);

  // Filter Kunden
  const filteredCustomers = useMemo(() => {
    let result = customers;

    // Filter nach relevanten Kunden
    if (showOnlyRelevant) {
      result = result.filter(c => 
        RELEVANT_CUSTOMERS.some(rc => 
          c.name.toLowerCase().includes(rc.toLowerCase()) ||
          c.slug.toLowerCase().includes(rc.toLowerCase())
        )
      );
    }

    // Filter nach Suchbegriff
    if (searchTerm) {
      result = result.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.slug.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result;
  }, [customers, showOnlyRelevant, searchTerm]);

  // Export als CSV (Standard)
  const exportToCSV = useCallback(() => {
    setExporting(true);

    const headers = [
      'Kunde',
      'Slug',
      'Status',
      // Facebook
      'FB Posts',
      'FB Impressions',
      'FB Reichweite',
      'FB Shares',
      'FB Reactions',
      'FB Kommentare',
      'FB Interaktionen',
      'FB Video Views',
      // Instagram
      'IG Posts',
      'IG Reichweite',
      'IG Likes',
      'IG Kommentare',
      'IG Saves',
      'IG Klicks',
      'IG Interaktionen',
    ];

    const rows = filteredCustomers.map(customer => {
      const stats = customerStats[customer.customer_id] || {} as CustomerStats;

      return [
        customer.name,
        customer.slug,
        customer.is_active ? 'Aktiv' : 'Inaktiv',
        // Facebook
        stats.fb_posts || 0,
        stats.fb_impressions || 0,
        stats.fb_reach || 0,
        stats.fb_shares || 0,
        stats.fb_reactions || 0,
        stats.fb_comments || 0,
        stats.fb_interactions || 0,
        stats.fb_video_views || 0,
        // Instagram
        stats.ig_posts || 0,
        stats.ig_reach || 0,
        stats.ig_likes || 0,
        stats.ig_comments || 0,
        stats.ig_saves || 0,
        stats.ig_profile_clicks || 0,
        stats.ig_interactions || 0,
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kunden_report_${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setExporting(false);
  }, [filteredCustomers, customerStats, selectedMonth]);

  // Export als Excel-ähnliches Format (exakt wie in der Excel-Vorlage)
  const exportDetailedCSV = useCallback(() => {
    setExporting(true);

    // Facebook-Daten (exakt wie Excel)
    const fbHeaders = [
      'Kunde',
      'Monat',
      'Plattform',
      'Impression',
      'Reichweite',
      'Teilen',
      'Liken',
      'Kommentare',
      'Interaktionen',
      'Video plays',
      'Saving',
    ];

    // Instagram-Daten (exakt wie Excel)
    const igHeaders = [
      'Kunde',
      'Monat',
      'Plattform',
      'Reichweite',
      'Likes',
      'Kommentare',
      'Saves',
      'Klicks',
      'Interaktionen',
    ];

    const fbRows = filteredCustomers.map(customer => {
      const stats = customerStats[customer.customer_id] || {} as CustomerStats;

      return [
        customer.name,
        selectedMonth,
        'Facebook',
        stats.fb_impressions || 0,
        stats.fb_reach || 0,
        stats.fb_shares || 0,
        stats.fb_reactions || 0,
        stats.fb_comments || 0,
        stats.fb_interactions || 0,
        stats.fb_video_views || 0,
        0, // Saving nicht verfügbar für Facebook
      ];
    });

    const igRows = filteredCustomers.map(customer => {
      const stats = customerStats[customer.customer_id] || {} as CustomerStats;

      return [
        customer.name,
        selectedMonth,
        'Instagram',
        stats.ig_reach || 0,
        stats.ig_likes || 0,
        stats.ig_comments || 0,
        stats.ig_saves || 0,
        stats.ig_profile_clicks || 0,
        stats.ig_interactions || 0,
      ];
    });

    // Kombinierter Export
    const csvContent = [
      '=== FACEBOOK ===',
      fbHeaders.join(';'),
      ...fbRows.map(row => row.join(';')),
      '',
      '=== INSTAGRAM ===',
      igHeaders.join(';'),
      ...igRows.map(row => row.join(';')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kunden_detailliert_${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setExporting(false);
  }, [filteredCustomers, customerStats, selectedMonth]);

  const totalCustomers = filteredCustomers.length;
  const activeCustomers = filteredCustomers.filter(c => c.is_active).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="text-3xl">👥</span>
          <div>
            <h1 className="text-3xl font-bold text-white">Kunden</h1>
            <p className="text-gray-500 mt-1">Kundenübersicht und Export wie in Excel</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-[#1f1f1f] text-white border border-[#262626] rounded-lg px-4 py-2 focus:border-[#84cc16] focus:outline-none"
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button
            onClick={exportToCSV}
            disabled={exporting}
            className="bg-[#84cc16] hover:bg-[#65a30d] text-black font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Download size={18} />
            CSV Export
          </button>

          <button
            onClick={exportDetailedCSV}
            disabled={exporting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Download size={18} />
            Excel-Format
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="bg-[#84cc16]/20 p-3 rounded-lg">
              <Users className="text-[#84cc16]" size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Gesamt Kunden</p>
              <p className="text-2xl font-bold text-white">{totalCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="bg-green-500/20 p-3 rounded-lg">
              <CheckCircle className="text-green-500" size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Aktive Kunden</p>
              <p className="text-2xl font-bold text-white">{activeCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <Building2 className="text-blue-500" size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Relevante Kunden (Excel)</p>
              <p className="text-2xl font-bold text-white">{showOnlyRelevant ? totalCustomers : customers.filter(c => 
                RELEVANT_CUSTOMERS.some(rc => c.name.toLowerCase().includes(rc.toLowerCase()))
              ).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Kunde suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1f1f1f] text-white border border-[#262626] rounded-lg pl-10 pr-4 py-2 focus:border-[#84cc16] focus:outline-none"
            />
          </div>

          <button
            onClick={() => setShowOnlyRelevant(!showOnlyRelevant)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showOnlyRelevant
                ? 'bg-[#84cc16]/20 border-[#84cc16] text-[#84cc16]'
                : 'bg-[#1f1f1f] border-[#262626] text-gray-400'
            }`}
          >
            <Filter size={18} />
            Nur Excel-Kunden
          </button>
        </div>
      </div>

      {/* Kunden-Tabelle */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#262626]">
          <h3 className="text-white font-bold text-lg">Kundenübersicht</h3>
          <p className="text-gray-500 text-sm">Alle Metriken für {monthOptions.find(m => m.value === selectedMonth)?.label}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#84cc16]"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#1a1a1a]">
                  <th className="text-left py-3 px-4 text-gray-400 text-xs uppercase tracking-wider sticky left-0 bg-[#1a1a1a]">Kunde</th>
                  <th className="text-center py-3 px-4 text-gray-400 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right py-3 px-4 text-blue-400 text-xs uppercase tracking-wider">FB Posts</th>
                  <th className="text-right py-3 px-4 text-blue-400 text-xs uppercase tracking-wider">FB Impr.</th>
                  <th className="text-right py-3 px-4 text-blue-400 text-xs uppercase tracking-wider">FB Reach</th>
                  <th className="text-right py-3 px-4 text-blue-400 text-xs uppercase tracking-wider">FB React.</th>
                  <th className="text-right py-3 px-4 text-blue-400 text-xs uppercase tracking-wider">FB Video</th>
                  <th className="text-right py-3 px-4 text-pink-400 text-xs uppercase tracking-wider">IG Posts</th>
                  <th className="text-right py-3 px-4 text-pink-400 text-xs uppercase tracking-wider">IG Reach</th>
                  <th className="text-right py-3 px-4 text-pink-400 text-xs uppercase tracking-wider">IG Likes</th>
                  <th className="text-right py-3 px-4 text-pink-400 text-xs uppercase tracking-wider">IG Saves</th>
                  <th className="text-right py-3 px-4 text-pink-400 text-xs uppercase tracking-wider">IG Klicks</th>
                  <th className="text-right py-3 px-4 text-[#84cc16] text-xs uppercase tracking-wider">Gesamt</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => {
                  const stats = customerStats[customer.customer_id] || {} as CustomerStats;
                  const totalInteractions = (stats.fb_interactions || 0) + (stats.ig_interactions || 0);

                  return (
                    <tr key={customer.customer_id} className="border-b border-[#262626]/50 hover:bg-[#1a1a1a] transition-colors">
                      <td className="py-3 px-4 sticky left-0 bg-[#141414]">
                        <div>
                          <p className="text-white font-medium">{customer.name}</p>
                          <p className="text-gray-500 text-xs">{customer.slug}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          customer.is_active
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {customer.is_active ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-white">{formatNumber(stats.fb_posts || 0)}</td>
                      <td className="py-3 px-4 text-right text-white">{formatNumber(stats.fb_impressions || 0)}</td>
                      <td className="py-3 px-4 text-right text-white">{formatNumber(stats.fb_reach || 0)}</td>
                      <td className="py-3 px-4 text-right text-white">{formatNumber(stats.fb_reactions || 0)}</td>
                      <td className="py-3 px-4 text-right text-white">{formatNumber(stats.fb_video_views || 0)}</td>
                      <td className="py-3 px-4 text-right text-white">{formatNumber(stats.ig_posts || 0)}</td>
                      <td className="py-3 px-4 text-right text-white">{formatNumber(stats.ig_reach || 0)}</td>
                      <td className="py-3 px-4 text-right text-white">{formatNumber(stats.ig_likes || 0)}</td>
                      <td className="py-3 px-4 text-right text-white">{formatNumber(stats.ig_saves || 0)}</td>
                      <td className="py-3 px-4 text-right text-white">{formatNumber(stats.ig_profile_clicks || 0)}</td>
                      <td className="py-3 px-4 text-right font-bold text-[#84cc16]">{formatNumber(totalInteractions)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Excel-Struktur Info & API-Hinweise */}
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
          <h3 className="text-white font-bold mb-3">📊 Export-Struktur (wie Excel)</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-blue-400 font-medium mb-2">Facebook Spalten:</h4>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>✅ Impression</li>
                <li>✅ Reichweite</li>
                <li>⚠️ Teilen (limited)</li>
                <li>✅ Liken (Reactions)</li>
                <li>✅ Kommentare</li>
                <li>✅ Interaktionen</li>
                <li>✅ Video plays</li>
                <li>❌ Saving (nicht verfügbar)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-pink-400 font-medium mb-2">Instagram Spalten:</h4>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>✅ Reichweite</li>
                <li>✅ Likes</li>
                <li>✅ Kommentare</li>
                <li>✅ Saves</li>
                <li>✅ Klicks (Profile Links)</li>
                <li>✅ Interaktionen</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <Info size={18} className="text-yellow-500" />
            API-Einschränkungen
          </h3>
          <ul className="text-gray-400 text-sm space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-yellow-500">⚠️</span>
              <span><strong>FB Shares:</strong> Nicht für alle Posts verfügbar (API-Einschränkung)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500">❌</span>
              <span><strong>FB Saves:</strong> Nicht über Graph API verfügbar</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500">❌</span>
              <span><strong>IG Profilaufrufe:</strong> Nur in nativer App sichtbar, nicht über API</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✅</span>
              <span><strong>IG Klicks:</strong> Profile Link Taps (Email, Call, Direction) verfügbar</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <DashboardLayout>
      <CustomersContent />
    </DashboardLayout>
  );
}
