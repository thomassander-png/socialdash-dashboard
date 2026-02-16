'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';

interface Customer {
  customer_id: number;
  name: string;
  slug: string;
  is_active: boolean;
}

interface ReportConfig {
  platforms: {
    facebook: boolean;
    instagram: boolean;
    ads: boolean;
    tiktok: boolean;
  };
  slides: {
    cover: boolean;
    fbOverview: boolean;
    fbTopPosts: boolean;
    fbAllPosts: boolean;
    fbFollower: boolean;
    igOverview: boolean;
    igTopPosts: boolean;
    igAllPosts: boolean;
    igFollower: boolean;
    igStories: boolean;
    igReels: boolean;
    adsOverview: boolean;
    adsCampaigns: boolean;
    summary: boolean;
  };
  kpis: {
    reach: boolean;
    impressions: boolean;
    engagement: boolean;
    engagementRate: boolean;
    followerGrowth: boolean;
    videoViews: boolean;
    linkClicks: boolean;
    saves: boolean;
    shares: boolean;
    adSpend: boolean;
    cpc: boolean;
    cpm: boolean;
    ctr: boolean;
    frequency: boolean;
  };
  notes: string;
}

const DEFAULT_CONFIG: ReportConfig = {
  platforms: { facebook: true, instagram: true, ads: true, tiktok: false },
  slides: {
    cover: true,
    fbOverview: true,
    fbTopPosts: true,
    fbAllPosts: true,
    fbFollower: true,
    igOverview: true,
    igTopPosts: true,
    igAllPosts: true,
    igFollower: true,
    igStories: false,
    igReels: false,
    adsOverview: true,
    adsCampaigns: true,
    summary: true,
  },
  kpis: {
    reach: true,
    impressions: true,
    engagement: true,
    engagementRate: true,
    followerGrowth: true,
    videoViews: false,
    linkClicks: false,
    saves: true,
    shares: true,
    adSpend: true,
    cpc: true,
    cpm: true,
    ctr: true,
    frequency: false,
  },
  notes: '',
};

// Store configs in localStorage (later: DB)
function getConfig(slug: string): ReportConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  const stored = localStorage.getItem(`report-config-${slug}`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
}

function saveConfig(slug: string, config: ReportConfig) {
  localStorage.setItem(`report-config-${slug}`, JSON.stringify(config));
}

function ReportConfigContent() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [config, setConfig] = useState<ReportConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const response = await fetch('/api/customers');
        if (response.ok) {
          const data = await response.json();
          const list = Array.isArray(data) ? data : (data.customers || []);
          const active = list.filter((c: Customer) => c.is_active !== false);
          setCustomers(active);
        }
      } catch (err) {
        console.error('Failed to fetch customers:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCustomers();
  }, []);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    const slug = customer.slug || customer.name.toLowerCase().replace(/\s+/g, '-');
    setConfig(getConfig(slug));
    setSaved(false);
  };

  const handleSave = () => {
    if (!selectedCustomer) return;
    const slug = selectedCustomer.slug || selectedCustomer.name.toLowerCase().replace(/\s+/g, '-');
    saveConfig(slug, config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleApplyToAll = () => {
    customers.forEach((c) => {
      const slug = c.slug || c.name.toLowerCase().replace(/\s+/g, '-');
      saveConfig(slug, config);
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const updatePlatform = (key: keyof ReportConfig['platforms'], value: boolean) => {
    setConfig((prev) => ({ ...prev, platforms: { ...prev.platforms, [key]: value } }));
  };

  const updateSlide = (key: keyof ReportConfig['slides'], value: boolean) => {
    setConfig((prev) => ({ ...prev, slides: { ...prev.slides, [key]: value } }));
  };

  const updateKpi = (key: keyof ReportConfig['kpis'], value: boolean) => {
    setConfig((prev) => ({ ...prev, kpis: { ...prev.kpis, [key]: value } }));
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-xl">⚙️</span> Report-Konfiguration
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Lege pro Kunde fest, welche Plattformen, Folien und KPIs im monatlichen Report erscheinen.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Customer List (Left) */}
        <div className="lg:col-span-1">
          <div className="bg-[#1e1e2e] rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-3 border-b border-gray-700">
              <input
                type="text"
                placeholder="Kunde suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#2d2d44] text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-[#84cc16] focus:outline-none"
              />
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-gray-500 text-sm">Lade Kunden...</div>
              ) : (
                filteredCustomers.map((customer) => {
                  const isSelected = selectedCustomer?.customer_id === customer.customer_id;
                  return (
                    <button
                      key={customer.customer_id}
                      onClick={() => handleSelectCustomer(customer)}
                      className={`w-full text-left px-4 py-3 text-sm transition-all border-b border-gray-800 ${
                        isSelected
                          ? 'bg-[#84cc16]/10 text-[#84cc16] border-l-2 border-l-[#84cc16]'
                          : 'text-gray-300 hover:bg-[#2d2d44] hover:text-white'
                      }`}
                    >
                      {customer.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Config Panel (Right) */}
        <div className="lg:col-span-3">
          {!selectedCustomer ? (
            <div className="bg-[#1e1e2e] rounded-xl border border-gray-700 p-12 text-center">
              <div className="text-4xl mb-4">👈</div>
              <h3 className="text-white font-semibold text-lg mb-2">Kunde ausw&auml;hlen</h3>
              <p className="text-gray-400 text-sm">W&auml;hle links einen Kunden aus, um dessen Report-Konfiguration zu bearbeiten.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Customer Header */}
              <div className="bg-[#1e1e2e] rounded-xl border border-gray-700 p-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedCustomer.name}</h2>
                  <p className="text-gray-400 text-xs mt-0.5">Report-Konfiguration bearbeiten</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleApplyToAll}
                    className="px-4 py-2 bg-[#2d2d44] text-gray-300 rounded-lg text-xs font-medium hover:bg-[#3d3d54] transition-all border border-gray-600"
                  >
                    Auf alle Kunden anwenden
                  </button>
                  <button
                    onClick={handleSave}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                      saved
                        ? 'bg-green-500 text-white'
                        : 'bg-[#84cc16] text-black hover:bg-[#9ae62a]'
                    }`}
                  >
                    {saved ? '✓ Gespeichert' : 'Speichern'}
                  </button>
                </div>
              </div>

              {/* Platforms */}
              <div className="bg-[#1e1e2e] rounded-xl border border-gray-700 p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span>🌐</span> Plattformen im Report
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: 'facebook' as const, label: 'Facebook', icon: '📘', color: 'blue' },
                    { key: 'instagram' as const, label: 'Instagram', icon: '📸', color: 'pink' },
                    { key: 'ads' as const, label: 'Paid Ads', icon: '📣', color: 'amber' },
                    { key: 'tiktok' as const, label: 'TikTok', icon: '🎵', color: 'cyan' },
                  ].map((platform) => (
                    <button
                      key={platform.key}
                      onClick={() => updatePlatform(platform.key, !config.platforms[platform.key])}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        config.platforms[platform.key]
                          ? `border-${platform.color}-500/50 bg-${platform.color}-500/10`
                          : 'border-gray-700 bg-[#2d2d44] opacity-50'
                      }`}
                    >
                      <div className="text-2xl mb-1">{platform.icon}</div>
                      <p className={`text-sm font-medium ${config.platforms[platform.key] ? 'text-white' : 'text-gray-500'}`}>
                        {platform.label}
                      </p>
                      <p className={`text-[10px] mt-1 ${config.platforms[platform.key] ? 'text-green-400' : 'text-gray-600'}`}>
                        {config.platforms[platform.key] ? 'Aktiv' : 'Deaktiviert'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Slides */}
              <div className="bg-[#1e1e2e] rounded-xl border border-gray-700 p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span>📑</span> Folien im Report
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* General */}
                  <div>
                    <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-2">Allgemein</p>
                    <div className="space-y-2">
                      {[
                        { key: 'cover' as const, label: 'Cover-Folie' },
                        { key: 'summary' as const, label: 'Zusammenfassung' },
                      ].map((slide) => (
                        <label key={slide.key} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={config.slides[slide.key]}
                            onChange={(e) => updateSlide(slide.key, e.target.checked)}
                            className="w-4 h-4 rounded border-gray-600 bg-[#2d2d44] text-[#84cc16] focus:ring-[#84cc16]"
                          />
                          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{slide.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Facebook */}
                  <div>
                    <p className="text-blue-400 text-[10px] font-semibold uppercase tracking-wider mb-2">Facebook</p>
                    <div className="space-y-2">
                      {[
                        { key: 'fbOverview' as const, label: 'FB &Uuml;bersicht KPIs' },
                        { key: 'fbTopPosts' as const, label: 'FB Top Posts' },
                        { key: 'fbAllPosts' as const, label: 'FB Alle Posts' },
                        { key: 'fbFollower' as const, label: 'FB Follower-Entwicklung' },
                      ].map((slide) => (
                        <label key={slide.key} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={config.slides[slide.key]}
                            onChange={(e) => updateSlide(slide.key, e.target.checked)}
                            disabled={!config.platforms.facebook}
                            className="w-4 h-4 rounded border-gray-600 bg-[#2d2d44] text-[#84cc16] focus:ring-[#84cc16] disabled:opacity-30"
                          />
                          <span className={`text-sm transition-colors ${!config.platforms.facebook ? 'text-gray-600' : 'text-gray-300 group-hover:text-white'}`}>
                            {slide.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Instagram */}
                  <div>
                    <p className="text-pink-400 text-[10px] font-semibold uppercase tracking-wider mb-2">Instagram</p>
                    <div className="space-y-2">
                      {[
                        { key: 'igOverview' as const, label: 'IG &Uuml;bersicht KPIs' },
                        { key: 'igTopPosts' as const, label: 'IG Top Posts' },
                        { key: 'igAllPosts' as const, label: 'IG Alle Posts' },
                        { key: 'igFollower' as const, label: 'IG Follower-Entwicklung' },
                        { key: 'igStories' as const, label: 'IG Stories' },
                        { key: 'igReels' as const, label: 'IG Reels' },
                      ].map((slide) => (
                        <label key={slide.key} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={config.slides[slide.key]}
                            onChange={(e) => updateSlide(slide.key, e.target.checked)}
                            disabled={!config.platforms.instagram}
                            className="w-4 h-4 rounded border-gray-600 bg-[#2d2d44] text-[#84cc16] focus:ring-[#84cc16] disabled:opacity-30"
                          />
                          <span className={`text-sm transition-colors ${!config.platforms.instagram ? 'text-gray-600' : 'text-gray-300 group-hover:text-white'}`}>
                            {slide.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ads Slides */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-amber-400 text-[10px] font-semibold uppercase tracking-wider mb-2">Paid Ads</p>
                  <div className="flex gap-6">
                    {[
                      { key: 'adsOverview' as const, label: 'Ads &Uuml;bersicht' },
                      { key: 'adsCampaigns' as const, label: 'Kampagnen-Details' },
                    ].map((slide) => (
                      <label key={slide.key} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={config.slides[slide.key]}
                          onChange={(e) => updateSlide(slide.key, e.target.checked)}
                          disabled={!config.platforms.ads}
                          className="w-4 h-4 rounded border-gray-600 bg-[#2d2d44] text-[#84cc16] focus:ring-[#84cc16] disabled:opacity-30"
                        />
                        <span className={`text-sm transition-colors ${!config.platforms.ads ? 'text-gray-600' : 'text-gray-300 group-hover:text-white'}`}>
                          {slide.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* KPIs */}
              <div className="bg-[#1e1e2e] rounded-xl border border-gray-700 p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span>📊</span> Kennzahlen (KPIs) im Report
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: 'reach' as const, label: 'Reichweite', group: 'organic' },
                    { key: 'impressions' as const, label: 'Impressionen', group: 'organic' },
                    { key: 'engagement' as const, label: 'Interaktionen', group: 'organic' },
                    { key: 'engagementRate' as const, label: 'Engagement Rate', group: 'organic' },
                    { key: 'followerGrowth' as const, label: 'Follower-Wachstum', group: 'organic' },
                    { key: 'videoViews' as const, label: 'Videoaufrufe', group: 'organic' },
                    { key: 'linkClicks' as const, label: 'Link-Klicks', group: 'organic' },
                    { key: 'saves' as const, label: 'Saves (IG)', group: 'organic' },
                    { key: 'shares' as const, label: 'Shares', group: 'organic' },
                    { key: 'adSpend' as const, label: 'Ad Spend', group: 'paid' },
                    { key: 'cpc' as const, label: 'CPC', group: 'paid' },
                    { key: 'cpm' as const, label: 'CPM', group: 'paid' },
                    { key: 'ctr' as const, label: 'CTR', group: 'paid' },
                    { key: 'frequency' as const, label: 'Frequenz', group: 'paid' },
                  ].map((kpi) => (
                    <label
                      key={kpi.key}
                      className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${
                        config.kpis[kpi.key]
                          ? 'bg-[#84cc16]/10 border border-[#84cc16]/30'
                          : 'bg-[#2d2d44] border border-gray-700 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={config.kpis[kpi.key]}
                        onChange={(e) => updateKpi(kpi.key, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-[#2d2d44] text-[#84cc16] focus:ring-[#84cc16]"
                      />
                      <div>
                        <span className="text-sm text-gray-200">{kpi.label}</span>
                        <span className={`block text-[9px] ${kpi.group === 'paid' ? 'text-amber-500' : 'text-blue-500'}`}>
                          {kpi.group === 'paid' ? 'Paid' : 'Organisch'}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="bg-[#1e1e2e] rounded-xl border border-gray-700 p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span>📝</span> Kundenspezifische Notizen
                </h3>
                <textarea
                  value={config.notes}
                  onChange={(e) => setConfig((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="z.B. 'Kunde möchte keine Follower-Zahlen sehen' oder 'Nur organische Reichweite reporten'..."
                  className="w-full bg-[#2d2d44] text-gray-300 text-sm rounded-lg px-4 py-3 border border-gray-600 focus:border-[#84cc16] focus:outline-none resize-none h-24"
                />
              </div>

              {/* Preview */}
              <div className="bg-[#1e1e2e] rounded-xl border border-gray-700 p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span>👁️</span> Report-Vorschau (Folien-Reihenfolge)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    config.slides.cover && { label: 'Cover', color: 'gray' },
                    config.platforms.facebook && config.slides.fbOverview && { label: 'FB Übersicht', color: 'blue' },
                    config.platforms.facebook && config.slides.fbTopPosts && { label: 'FB Top Posts', color: 'blue' },
                    config.platforms.facebook && config.slides.fbAllPosts && { label: 'FB Alle Posts', color: 'blue' },
                    config.platforms.facebook && config.slides.fbFollower && { label: 'FB Follower', color: 'blue' },
                    config.platforms.instagram && config.slides.igOverview && { label: 'IG Übersicht', color: 'pink' },
                    config.platforms.instagram && config.slides.igTopPosts && { label: 'IG Top Posts', color: 'pink' },
                    config.platforms.instagram && config.slides.igAllPosts && { label: 'IG Alle Posts', color: 'pink' },
                    config.platforms.instagram && config.slides.igFollower && { label: 'IG Follower', color: 'pink' },
                    config.platforms.instagram && config.slides.igStories && { label: 'IG Stories', color: 'pink' },
                    config.platforms.instagram && config.slides.igReels && { label: 'IG Reels', color: 'pink' },
                    config.platforms.ads && config.slides.adsOverview && { label: 'Ads Übersicht', color: 'amber' },
                    config.platforms.ads && config.slides.adsCampaigns && { label: 'Ads Kampagnen', color: 'amber' },
                    config.slides.summary && { label: 'Zusammenfassung', color: 'gray' },
                  ]
                    .filter(Boolean)
                    .map((slide, i) => {
                      const s = slide as { label: string; color: string };
                      const colorMap: Record<string, string> = {
                        blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
                        pink: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
                        amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                        gray: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
                      };
                      return (
                        <div
                          key={i}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${colorMap[s.color] || colorMap.gray} flex items-center gap-1.5`}
                        >
                          <span className="text-gray-500 text-[10px]">{i + 1}.</span>
                          {s.label}
                        </div>
                      );
                    })}
                </div>
                <p className="text-gray-500 text-xs mt-3">
                  {[
                    config.slides.cover,
                    config.platforms.facebook && config.slides.fbOverview,
                    config.platforms.facebook && config.slides.fbTopPosts,
                    config.platforms.facebook && config.slides.fbAllPosts,
                    config.platforms.facebook && config.slides.fbFollower,
                    config.platforms.instagram && config.slides.igOverview,
                    config.platforms.instagram && config.slides.igTopPosts,
                    config.platforms.instagram && config.slides.igAllPosts,
                    config.platforms.instagram && config.slides.igFollower,
                    config.platforms.instagram && config.slides.igStories,
                    config.platforms.instagram && config.slides.igReels,
                    config.platforms.ads && config.slides.adsOverview,
                    config.platforms.ads && config.slides.adsCampaigns,
                    config.slides.summary,
                  ].filter(Boolean).length}{' '}
                  Folien im Report
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReportConfigPage() {
  return (
    <DashboardLayout>
      <ReportConfigContent />
    </DashboardLayout>
  );
}
