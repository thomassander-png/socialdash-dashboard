'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';

interface Customer {
  customer_id: number;
  name: string;
  slug: string;
  is_active: boolean;
}

interface SlideInfo {
  id: string;
  name: string;
  description: string;
  platform: string;
  category: string;
  order: number;
}

interface ReportConfig {
  platforms: {
    facebook: boolean;
    instagram: boolean;
    ads: boolean;
    tiktok: boolean;
    linkedin: boolean;
  };
  slides: Record<string, boolean>;
  kpis: Record<string, boolean>;
  notes: string;
}

const DEFAULT_CONFIG: ReportConfig = {
  platforms: { facebook: true, instagram: true, ads: true, tiktok: false, linkedin: false },
  slides: {
    cover: true,
    executiveSummary: true,
    fbDivider: false,
    fbKennzahlen: true,
    fbTopPosts: true,
    fbVideos: true,
    fbPpas: true,
    fbEinzelkampagnen: false,
    fbDemographie: true,
    igDivider: false,
    igKennzahlen: true,
    igTopPosts: true,
    igReels: true,
    igPpas: true,
    adsCampaigns: true,
    zusammenfassung: true,
    glossar: false,
    kontakt: true,
    tiktokDivider: false,
    tiktokKennzahlen: false,
    linkedinDivider: false,
    linkedinKennzahlen: false,
  },
  kpis: {
    reach: true, impressions: true, engagement: true, engagementRate: true,
    followerGrowth: true, videoViews: false, linkClicks: false,
    saves: true, shares: true, adSpend: true, cpc: true, cpm: true, ctr: true, frequency: false,
  },
  notes: '',
};

// Platform colors & icons
const PLATFORM_META: Record<string, { label: string; icon: string; color: string; borderClass: string; bgClass: string; textClass: string }> = {
  general: { label: 'Allgemein', icon: '📋', color: 'gray', borderClass: 'border-gray-500/30', bgClass: 'bg-gray-500/10', textClass: 'text-gray-400' },
  facebook: { label: 'Facebook', icon: '📘', color: 'blue', borderClass: 'border-blue-500/30', bgClass: 'bg-blue-500/10', textClass: 'text-blue-400' },
  instagram: { label: 'Instagram', icon: '📸', color: 'pink', borderClass: 'border-pink-500/30', bgClass: 'bg-pink-500/10', textClass: 'text-pink-400' },
  ads: { label: 'Paid Ads', icon: '📣', color: 'amber', borderClass: 'border-amber-500/30', bgClass: 'bg-amber-500/10', textClass: 'text-amber-400' },
  tiktok: { label: 'TikTok', icon: '🎵', color: 'cyan', borderClass: 'border-cyan-500/30', bgClass: 'bg-cyan-500/10', textClass: 'text-cyan-400' },
  linkedin: { label: 'LinkedIn', icon: '💼', color: 'sky', borderClass: 'border-sky-500/30', bgClass: 'bg-sky-500/10', textClass: 'text-sky-400' },
  'cross-platform': { label: 'Cross-Platform', icon: '🔗', color: 'purple', borderClass: 'border-purple-500/30', bgClass: 'bg-purple-500/10', textClass: 'text-purple-400' },
};

const CATEGORY_LABELS: Record<string, string> = {
  cover: 'Cover',
  divider: 'Trenner',
  kpi: 'Kennzahlen',
  content: 'Content',
  ads: 'Werbung',
  summary: 'Zusammenfassung',
  contact: 'Kontakt',
};

function getConfig(slug: string): ReportConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  const stored = localStorage.getItem(`report-config-${slug}`);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        platforms: { ...DEFAULT_CONFIG.platforms, ...parsed.platforms },
        slides: { ...DEFAULT_CONFIG.slides, ...parsed.slides },
        kpis: { ...DEFAULT_CONFIG.kpis, ...parsed.kpis },
        notes: parsed.notes || '',
      };
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
  const [slideRegistry, setSlideRegistry] = useState<SlideInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch customers
  useEffect(() => {
    async function fetchCustomers() {
      try {
        const response = await fetch('/api/customers');
        if (response.ok) {
          const data = await response.json();
          const list = Array.isArray(data) ? data : (data.customers || []);
          setCustomers(list.filter((c: Customer) => c.is_active !== false));
        }
      } catch (err) {
        console.error('Failed to fetch customers:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCustomers();
  }, []);

  // Fetch slide registry from API
  useEffect(() => {
    async function fetchSlides() {
      try {
        // Use any customer slug to get the slide list (it's the same for all)
        const response = await fetch('/api/reports/list-slides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'list-slides' }),
        });
        if (response.ok) {
          const data = await response.json();
          setSlideRegistry(data.slides || []);
        }
      } catch (err) {
        console.error('Failed to fetch slide registry:', err);
        // Fallback: build from DEFAULT_CONFIG keys
        setSlideRegistry(Object.keys(DEFAULT_CONFIG.slides).map((id, i) => ({
          id, name: id, description: '', platform: 'general', category: 'kpi', order: i * 10,
        })));
      }
    }
    fetchSlides();
  }, []);

  // Group slides by platform
  const slidesByPlatform = useMemo(() => {
    const groups: Record<string, SlideInfo[]> = {};
    for (const slide of slideRegistry) {
      if (!groups[slide.platform]) groups[slide.platform] = [];
      groups[slide.platform].push(slide);
    }
    // Sort within each group
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => a.order - b.order);
    }
    return groups;
  }, [slideRegistry]);

  // Compute active slides for preview
  const activeSlides = useMemo(() => {
    return slideRegistry
      .filter(s => {
        if (!config.slides[s.id]) return false;
        // Check platform
        const platform = s.platform;
        if (platform !== 'general' && platform !== 'cross-platform') {
          const platformKey = platform as keyof ReportConfig['platforms'];
          if (!config.platforms[platformKey]) return false;
        }
        return true;
      })
      .sort((a, b) => a.order - b.order);
  }, [config, slideRegistry]);

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

  const updateSlide = (id: string, value: boolean) => {
    setConfig((prev) => ({ ...prev, slides: { ...prev.slides, [id]: value } }));
  };

  const updateKpi = (key: string, value: boolean) => {
    setConfig((prev) => ({ ...prev, kpis: { ...prev.kpis, [key]: value } }));
  };

  const toggleAllSlidesForPlatform = (platform: string, value: boolean) => {
    const platformSlides = slidesByPlatform[platform] || [];
    setConfig((prev) => {
      const newSlides = { ...prev.slides };
      for (const s of platformSlides) {
        newSlides[s.id] = value;
      }
      return { ...prev, slides: newSlides };
    });
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Platform order for display
  const platformOrder = ['general', 'facebook', 'instagram', 'ads', 'tiktok', 'linkedin', 'cross-platform'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-xl">⚙️</span> Report-Konfiguration
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Lege pro Kunde fest, welche Plattformen, Folien und KPIs im monatlichen Report erscheinen.
          Jede Folie kann individuell aktiviert/deaktiviert werden.
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
              <h3 className="text-white font-semibold text-lg mb-2">Kunde auswählen</h3>
              <p className="text-gray-400 text-sm">Wähle links einen Kunden aus, um dessen Report-Konfiguration zu bearbeiten.</p>
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
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {(['facebook', 'instagram', 'ads', 'tiktok', 'linkedin'] as const).map((key) => {
                    const meta = PLATFORM_META[key];
                    const isActive = config.platforms[key];
                    return (
                      <button
                        key={key}
                        onClick={() => updatePlatform(key, !isActive)}
                        className={`p-4 rounded-xl border-2 transition-all text-center ${
                          isActive
                            ? `${meta.borderClass} ${meta.bgClass}`
                            : 'border-gray-700 bg-[#2d2d44] opacity-50'
                        }`}
                      >
                        <div className="text-2xl mb-1">{meta.icon}</div>
                        <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-500'}`}>
                          {meta.label}
                        </p>
                        <p className={`text-[10px] mt-0.5 ${isActive ? meta.textClass : 'text-gray-600'}`}>
                          {isActive ? 'Aktiv' : 'Deaktiviert'}
                        </p>
                        {(key === 'tiktok' || key === 'linkedin') && (
                          <span className="text-[9px] text-gray-500 mt-1 block">Bald verfügbar</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modular Slides */}
              <div className="bg-[#1e1e2e] rounded-xl border border-gray-700 p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span>📑</span> Folien im Report
                </h3>
                <p className="text-gray-500 text-xs mb-4">
                  Aktiviere oder deaktiviere einzelne Folien. Deaktivierte Plattformen werden automatisch ausgeblendet.
                </p>

                <div className="space-y-4">
                  {platformOrder.map((platform) => {
                    const slides = slidesByPlatform[platform];
                    if (!slides || slides.length === 0) return null;
                    const meta = PLATFORM_META[platform] || PLATFORM_META.general;
                    const platformKey = platform as keyof ReportConfig['platforms'];
                    const isPlatformDisabled = platform !== 'general' && platform !== 'cross-platform' && !config.platforms[platformKey];
                    const allEnabled = slides.every(s => config.slides[s.id]);
                    const someEnabled = slides.some(s => config.slides[s.id]);

                    return (
                      <div key={platform} className={`rounded-lg border ${isPlatformDisabled ? 'border-gray-800 opacity-40' : 'border-gray-700'} overflow-hidden`}>
                        {/* Platform header */}
                        <div className={`px-4 py-2.5 flex items-center justify-between ${isPlatformDisabled ? 'bg-[#1a1a28]' : 'bg-[#252538]'}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{meta.icon}</span>
                            <span className={`text-xs font-semibold uppercase tracking-wider ${meta.textClass}`}>
                              {meta.label}
                            </span>
                            <span className="text-gray-600 text-[10px]">
                              ({slides.filter(s => config.slides[s.id]).length}/{slides.length} aktiv)
                            </span>
                          </div>
                          {!isPlatformDisabled && (
                            <button
                              onClick={() => toggleAllSlidesForPlatform(platform, !allEnabled)}
                              className="text-[10px] text-gray-400 hover:text-white transition-colors px-2 py-1 rounded bg-[#2d2d44]"
                            >
                              {allEnabled ? 'Alle deaktivieren' : someEnabled ? 'Alle aktivieren' : 'Alle aktivieren'}
                            </button>
                          )}
                        </div>

                        {/* Slides grid */}
                        <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {slides.map((slide) => {
                            const isEnabled = config.slides[slide.id] && !isPlatformDisabled;
                            return (
                              <label
                                key={slide.id}
                                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                  isPlatformDisabled
                                    ? 'opacity-30 cursor-not-allowed'
                                    : isEnabled
                                    ? `${meta.bgClass} border ${meta.borderClass}`
                                    : 'bg-[#2d2d44] border border-gray-700 hover:border-gray-600'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={config.slides[slide.id] || false}
                                  onChange={(e) => updateSlide(slide.id, e.target.checked)}
                                  disabled={isPlatformDisabled}
                                  className="w-4 h-4 mt-0.5 rounded border-gray-600 bg-[#2d2d44] text-[#84cc16] focus:ring-[#84cc16] disabled:opacity-30 flex-shrink-0"
                                />
                                <div className="min-w-0">
                                  <span className={`text-sm font-medium block ${isEnabled ? 'text-white' : 'text-gray-400'}`}>
                                    {slide.name}
                                  </span>
                                  <span className="text-[10px] text-gray-500 block mt-0.5 leading-tight">
                                    {slide.description}
                                  </span>
                                  <span className={`text-[9px] mt-1 inline-block px-1.5 py-0.5 rounded ${meta.bgClass} ${meta.textClass}`}>
                                    {CATEGORY_LABELS[slide.category] || slide.category}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* KPIs */}
              <div className="bg-[#1e1e2e] rounded-xl border border-gray-700 p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span>📊</span> Kennzahlen (KPIs) im Report
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: 'reach', label: 'Reichweite', group: 'organic' },
                    { key: 'impressions', label: 'Impressionen', group: 'organic' },
                    { key: 'engagement', label: 'Interaktionen', group: 'organic' },
                    { key: 'engagementRate', label: 'Engagement Rate', group: 'organic' },
                    { key: 'followerGrowth', label: 'Follower-Wachstum', group: 'organic' },
                    { key: 'videoViews', label: 'Videoaufrufe', group: 'organic' },
                    { key: 'linkClicks', label: 'Link-Klicks', group: 'organic' },
                    { key: 'saves', label: 'Saves (IG)', group: 'organic' },
                    { key: 'shares', label: 'Shares', group: 'organic' },
                    { key: 'adSpend', label: 'Ad Spend', group: 'paid' },
                    { key: 'cpc', label: 'CPC', group: 'paid' },
                    { key: 'cpm', label: 'CPM', group: 'paid' },
                    { key: 'ctr', label: 'CTR', group: 'paid' },
                    { key: 'frequency', label: 'Frequenz', group: 'paid' },
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
                        checked={config.kpis[kpi.key] || false}
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

              {/* Preview: Active slides in order */}
              <div className="bg-[#1e1e2e] rounded-xl border border-gray-700 p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span>👁️</span> Report-Vorschau ({activeSlides.length} Folien)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {activeSlides.map((slide, i) => {
                    const meta = PLATFORM_META[slide.platform] || PLATFORM_META.general;
                    return (
                      <div
                        key={slide.id}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${meta.borderClass} ${meta.bgClass} ${meta.textClass}`}
                      >
                        <span className="text-gray-500 text-[10px]">{i + 1}.</span>
                        {slide.name}
                      </div>
                    );
                  })}
                </div>
                {activeSlides.length === 0 && (
                  <p className="text-gray-500 text-sm">Keine Folien aktiviert.</p>
                )}
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
