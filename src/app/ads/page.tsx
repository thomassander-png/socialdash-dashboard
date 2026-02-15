'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { 
  DollarSign, Eye, MousePointer, Target, TrendingUp, 
  BarChart3, Megaphone, Users, ArrowUpRight, ArrowDownRight,
  Loader2, AlertCircle, RefreshCw
} from 'lucide-react';

interface AdAccount {
  id: string;
  name: string;
  account_id: string;
  currency: string;
}

interface CampaignInsight {
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  cpc: number;
  cpm: number;
  ctr: number;
  conversions: number;
  leads: number;
  link_clicks: number;
  post_engagement: number;
  page_likes: number;
  cost_per_lead: number;
  cost_per_conversion: number;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  account_name: string;
  account_id: string;
  currency: string;
  insight: CampaignInsight;
}

interface AccountSummary {
  account_id: string;
  account_name: string;
  currency: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  cpc: number;
  cpm: number;
  ctr: number;
  conversions: number;
  leads: number;
  link_clicks: number;
}

interface AdsData {
  month: string;
  adAccounts: AdAccount[];
  accountSummaries: AccountSummary[];
  campaigns: Campaign[];
  totals: {
    totalSpend: number;
    totalImpressions: number;
    totalReach: number;
    totalClicks: number;
    totalConversions: number;
    totalLeads: number;
    avgCPC: number;
    avgCPM: number;
    avgCTR: number;
  };
}

function formatCurrency(value: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString('de-DE');
}

function formatNumberRaw(num: number): string {
  return num.toLocaleString('de-DE');
}

function formatPercent(num: number): string {
  return num.toFixed(2) + '%';
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

function getObjectiveLabel(objective: string): string {
  const labels: Record<string, string> = {
    'OUTCOME_AWARENESS': 'Bekanntheit',
    'OUTCOME_ENGAGEMENT': 'Engagement',
    'OUTCOME_LEADS': 'Leads',
    'OUTCOME_SALES': 'Verkäufe',
    'OUTCOME_TRAFFIC': 'Traffic',
    'OUTCOME_APP_PROMOTION': 'App-Promotion',
    'LINK_CLICKS': 'Link-Klicks',
    'POST_ENGAGEMENT': 'Post-Engagement',
    'REACH': 'Reichweite',
    'BRAND_AWARENESS': 'Markenbekanntheit',
    'LEAD_GENERATION': 'Lead-Generierung',
    'CONVERSIONS': 'Conversions',
    'MESSAGES': 'Nachrichten',
    'VIDEO_VIEWS': 'Video-Views',
    'PAGE_LIKES': 'Seiten-Likes',
  };
  return labels[objective] || objective;
}

function getStatusBadge(status: string) {
  const colors: Record<string, string> = {
    'ACTIVE': 'bg-green-500/20 text-green-400 border-green-500/30',
    'PAUSED': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'COMPLETED': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'ARCHIVED': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  const labels: Record<string, string> = {
    'ACTIVE': 'Aktiv',
    'PAUSED': 'Pausiert',
    'COMPLETED': 'Abgeschlossen',
    'ARCHIVED': 'Archiviert',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
      {labels[status] || status}
    </span>
  );
}

// KPI Card Component
function AdsKPICard({ title, value, subtitle, icon: Icon, accentColor, trend }: {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  accentColor: string;
  trend?: 'up' | 'down' | null;
}) {
  return (
    <div className={`bg-[#141414] border border-[#262626] border-l-4 ${accentColor} rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-xs uppercase tracking-wider font-medium">{title}</span>
        <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center">
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      {subtitle && <p className="text-gray-500 text-xs">{subtitle}</p>}
    </div>
  );
}

export default function AdsPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<AdsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const monthOptions = getMonthOptions();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/ads?month=${selectedMonth}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error('Error fetching ads data:', err);
      setError(err.message || 'Fehler beim Laden der Ads-Daten');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Megaphone className="w-8 h-8 text-purple-400" />
              Ads Performance
            </h1>
            <p className="text-gray-400 mt-1">Meta Ads Kampagnen-Übersicht & KPIs</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-lg bg-[#1a1a1a] border border-[#262626] text-gray-400 hover:text-white hover:border-purple-500/50 transition-colors disabled:opacity-50"
              title="Daten aktualisieren"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[#141414] border border-[#262626] text-white rounded-lg px-4 py-2 text-sm focus:border-purple-500 focus:outline-none"
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Lade Ads-Daten von Meta...</p>
              <p className="text-gray-500 text-sm mt-1">Dies kann einige Sekunden dauern</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-red-400 font-medium mb-1">Fehler beim Laden der Ads-Daten</h3>
                <p className="text-gray-400 text-sm">{error}</p>
                <p className="text-gray-500 text-xs mt-2">
                  Mögliche Ursachen: Fehlende ads_read Berechtigung, ungültiger Token, oder keine Werbekonten vorhanden.
                </p>
                <button
                  onClick={fetchData}
                  className="mt-3 px-4 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                >
                  Erneut versuchen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Data Display */}
        {data && !loading && (
          <>
            {/* Ad Accounts Info */}
            {data.adAccounts.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {data.adAccounts.map(account => (
                  <div key={account.id} className="bg-[#141414] border border-[#262626] rounded-lg px-3 py-1.5 text-xs">
                    <span className="text-gray-500">Konto:</span>{' '}
                    <span className="text-white font-medium">{account.name}</span>
                    <span className="text-gray-600 ml-2">({account.currency})</span>
                  </div>
                ))}
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <AdsKPICard
                title="Ausgaben"
                value={formatCurrency(data.totals.totalSpend)}
                subtitle="Gesamtausgaben im Zeitraum"
                icon={DollarSign}
                accentColor="border-l-purple-500"
              />
              <AdsKPICard
                title="Impressionen"
                value={formatNumber(data.totals.totalImpressions)}
                subtitle={`CPM: ${formatCurrency(data.totals.avgCPM)}`}
                icon={Eye}
                accentColor="border-l-blue-500"
              />
              <AdsKPICard
                title="Reichweite"
                value={formatNumber(data.totals.totalReach)}
                subtitle="Unique Users erreicht"
                icon={Users}
                accentColor="border-l-green-500"
              />
              <AdsKPICard
                title="Klicks"
                value={formatNumber(data.totals.totalClicks)}
                subtitle={`CPC: ${formatCurrency(data.totals.avgCPC)} · CTR: ${formatPercent(data.totals.avgCTR)}`}
                icon={MousePointer}
                accentColor="border-l-yellow-500"
              />
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-orange-400" />
                  <span className="text-gray-400 text-xs uppercase tracking-wider">Conversions</span>
                </div>
                <div className="text-2xl font-bold text-white">{formatNumberRaw(data.totals.totalConversions)}</div>
                <p className="text-gray-500 text-xs mt-1">Abgeschlossene Aktionen</p>
              </div>
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span className="text-gray-400 text-xs uppercase tracking-wider">Leads</span>
                </div>
                <div className="text-2xl font-bold text-white">{formatNumberRaw(data.totals.totalLeads)}</div>
                <p className="text-gray-500 text-xs mt-1">Generierte Leads</p>
              </div>
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-pink-400" />
                  <span className="text-gray-400 text-xs uppercase tracking-wider">Kampagnen</span>
                </div>
                <div className="text-2xl font-bold text-white">{data.campaigns.length}</div>
                <p className="text-gray-500 text-xs mt-1">Aktive/Pausierte Kampagnen</p>
              </div>
            </div>

            {/* Account Summaries */}
            {data.accountSummaries.length > 1 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-400" />
                  Werbekonten Übersicht
                </h2>
                <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#262626]">
                          <th className="text-left text-gray-400 font-medium px-4 py-3">Konto</th>
                          <th className="text-right text-gray-400 font-medium px-4 py-3">Ausgaben</th>
                          <th className="text-right text-gray-400 font-medium px-4 py-3">Impressionen</th>
                          <th className="text-right text-gray-400 font-medium px-4 py-3">Reichweite</th>
                          <th className="text-right text-gray-400 font-medium px-4 py-3">Klicks</th>
                          <th className="text-right text-gray-400 font-medium px-4 py-3">CTR</th>
                          <th className="text-right text-gray-400 font-medium px-4 py-3">CPC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.accountSummaries.map((account) => (
                          <tr key={account.account_id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                            <td className="px-4 py-3 text-white font-medium">{account.account_name}</td>
                            <td className="px-4 py-3 text-right text-purple-400 font-medium">{formatCurrency(account.spend, account.currency)}</td>
                            <td className="px-4 py-3 text-right text-gray-300">{formatNumberRaw(account.impressions)}</td>
                            <td className="px-4 py-3 text-right text-gray-300">{formatNumberRaw(account.reach)}</td>
                            <td className="px-4 py-3 text-right text-gray-300">{formatNumberRaw(account.clicks)}</td>
                            <td className="px-4 py-3 text-right text-gray-300">{formatPercent(account.ctr)}</td>
                            <td className="px-4 py-3 text-right text-gray-300">{formatCurrency(account.cpc, account.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Campaigns Table */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-purple-400" />
                Kampagnen Performance
              </h2>
              {data.campaigns.length === 0 ? (
                <div className="bg-[#141414] border border-[#262626] rounded-xl p-8 text-center">
                  <Megaphone className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 mb-1">Keine Kampagnen-Daten für diesen Zeitraum</p>
                  <p className="text-gray-500 text-sm">
                    Es wurden keine aktiven Kampagnen im ausgewählten Monat gefunden.
                  </p>
                </div>
              ) : (
                <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#262626]">
                          <th className="text-left text-gray-400 font-medium px-4 py-3">Kampagne</th>
                          <th className="text-center text-gray-400 font-medium px-4 py-3">Status</th>
                          <th className="text-left text-gray-400 font-medium px-4 py-3">Ziel</th>
                          <th className="text-right text-gray-400 font-medium px-4 py-3">Ausgaben</th>
                          <th className="text-right text-gray-400 font-medium px-4 py-3">Impressionen</th>
                          <th className="text-right text-gray-400 font-medium px-4 py-3">Reichweite</th>
                          <th className="text-right text-gray-400 font-medium px-4 py-3">Klicks</th>
                          <th className="text-right text-gray-400 font-medium px-4 py-3">CTR</th>
                          <th className="text-right text-gray-400 font-medium px-4 py-3">CPC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.campaigns.map((campaign) => (
                          <tr key={campaign.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                            <td className="px-4 py-3">
                              <div className="text-white font-medium truncate max-w-[250px]" title={campaign.name}>
                                {campaign.name}
                              </div>
                              <div className="text-gray-500 text-xs mt-0.5">{campaign.account_name}</div>
                            </td>
                            <td className="px-4 py-3 text-center">{getStatusBadge(campaign.status)}</td>
                            <td className="px-4 py-3 text-gray-300 text-xs">{getObjectiveLabel(campaign.objective)}</td>
                            <td className="px-4 py-3 text-right text-purple-400 font-medium">
                              {formatCurrency(campaign.insight.spend, campaign.currency)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-300">{formatNumberRaw(campaign.insight.impressions)}</td>
                            <td className="px-4 py-3 text-right text-gray-300">{formatNumberRaw(campaign.insight.reach)}</td>
                            <td className="px-4 py-3 text-right text-gray-300">{formatNumberRaw(campaign.insight.clicks)}</td>
                            <td className="px-4 py-3 text-right text-gray-300">{formatPercent(campaign.insight.ctr)}</td>
                            <td className="px-4 py-3 text-right text-gray-300">{formatCurrency(campaign.insight.cpc, campaign.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Spend Distribution Chart (simple bar visualization) */}
            {data.campaigns.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  Ausgaben nach Kampagne
                </h2>
                <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
                  <div className="space-y-4">
                    {data.campaigns.slice(0, 10).map((campaign) => {
                      const maxSpend = data.campaigns[0]?.insight.spend || 1;
                      const percentage = (campaign.insight.spend / maxSpend) * 100;
                      return (
                        <div key={campaign.id}>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-sm text-gray-300 truncate max-w-[60%]" title={campaign.name}>
                              {campaign.name}
                            </span>
                            <span className="text-sm text-purple-400 font-medium">
                              {formatCurrency(campaign.insight.spend, campaign.currency)}
                            </span>
                          </div>
                          <div className="h-3 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400"
                              style={{ width: `${Math.max(percentage, 2)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <Megaphone className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-purple-400 font-medium mb-1">Meta Ads Reporting</h3>
                  <p className="text-gray-400 text-sm">
                    Diese Daten werden direkt über die Meta Marketing API (ads_read) abgerufen. 
                    Die Daten werden alle 5 Minuten aktualisiert. Ausgaben werden in der Währung 
                    des jeweiligen Werbekontos angezeigt.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty State - No data and no error */}
        {!data && !loading && !error && (
          <div className="text-center py-20">
            <Megaphone className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-white text-lg font-medium mb-2">Keine Ads-Daten verfügbar</h3>
            <p className="text-gray-400 text-sm">
              Stelle sicher, dass die Meta Ads API korrekt konfiguriert ist.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
