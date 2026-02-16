'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { 
  DollarSign, Eye, MousePointer, Target, TrendingUp, 
  BarChart3, Megaphone, Users, ArrowLeft,
  Loader2, AlertCircle, RefreshCw, Download, Clock,
  Building2, ChevronRight, Filter
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────

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
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
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
  adAccounts: { id: string; name: string; account_id: string; currency: string }[];
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
  synced_at?: string;
  needsSync?: boolean;
  cached?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function fmt(value: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('de-DE');
}

function fmtRaw(n: number): string { return n.toLocaleString('de-DE'); }
function fmtPct(n: number): string { return n.toFixed(2) + '%'; }

function getMonthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({ value: d.toISOString().slice(0, 7), label: d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }) });
  }
  return opts;
}

function getObjectiveLabel(obj: string): string {
  const m: Record<string, string> = {
    OUTCOME_AWARENESS: 'Bekanntheit', OUTCOME_ENGAGEMENT: 'Engagement', OUTCOME_LEADS: 'Leads',
    OUTCOME_SALES: 'Verkäufe', OUTCOME_TRAFFIC: 'Traffic', OUTCOME_APP_PROMOTION: 'App-Promotion',
    LINK_CLICKS: 'Link-Klicks', POST_ENGAGEMENT: 'Post-Engagement', REACH: 'Reichweite',
    BRAND_AWARENESS: 'Markenbekanntheit', LEAD_GENERATION: 'Lead-Generierung',
    CONVERSIONS: 'Conversions', MESSAGES: 'Nachrichten', VIDEO_VIEWS: 'Video-Views', PAGE_LIKES: 'Seiten-Likes',
  };
  return m[obj] || obj;
}

// Accent colors for customer cards
const ACCENT_COLORS = [
  { border: 'border-l-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-400', bar: 'from-purple-600 to-purple-400' },
  { border: 'border-l-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400', bar: 'from-blue-600 to-blue-400' },
  { border: 'border-l-green-500', bg: 'bg-green-500/10', text: 'text-green-400', bar: 'from-green-600 to-green-400' },
  { border: 'border-l-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-400', bar: 'from-orange-600 to-orange-400' },
  { border: 'border-l-cyan-500', bg: 'bg-cyan-500/10', text: 'text-cyan-400', bar: 'from-cyan-600 to-cyan-400' },
  { border: 'border-l-pink-500', bg: 'bg-pink-500/10', text: 'text-pink-400', bar: 'from-pink-600 to-pink-400' },
  { border: 'border-l-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-400', bar: 'from-yellow-600 to-yellow-400' },
  { border: 'border-l-red-500', bg: 'bg-red-500/10', text: 'text-red-400', bar: 'from-red-600 to-red-400' },
  { border: 'border-l-indigo-500', bg: 'bg-indigo-500/10', text: 'text-indigo-400', bar: 'from-indigo-600 to-indigo-400' },
  { border: 'border-l-teal-500', bg: 'bg-teal-500/10', text: 'text-teal-400', bar: 'from-teal-600 to-teal-400' },
  { border: 'border-l-violet-500', bg: 'bg-violet-500/10', text: 'text-violet-400', bar: 'from-violet-600 to-violet-400' },
  { border: 'border-l-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400', bar: 'from-emerald-600 to-emerald-400' },
  { border: 'border-l-rose-500', bg: 'bg-rose-500/10', text: 'text-rose-400', bar: 'from-rose-600 to-rose-400' },
];

// ─── Components ──────────────────────────────────────────────────────

function KPICard({ title, value, subtitle, icon: Icon, borderColor }: {
  title: string; value: string; subtitle?: string; icon: any; borderColor: string;
}) {
  return (
    <div className={`bg-[#141414] border border-[#262626] border-l-4 ${borderColor} rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-xs uppercase tracking-wider font-medium">{title}</span>
        <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center">
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      {subtitle && <p className="text-gray-500 text-xs">{subtitle}</p>}
    </div>
  );
}

/** Customer card in the overview grid */
function CustomerCard({ account, campaigns, color, onClick }: {
  account: AccountSummary; campaigns: Campaign[]; color: typeof ACCENT_COLORS[0]; onClick: () => void;
}) {
  const campaignCount = campaigns.length;
  return (
    <button
      onClick={onClick}
      className={`bg-[#141414] border border-[#262626] border-l-4 ${color.border} rounded-xl p-5 text-left hover:bg-[#1a1a1a] hover:border-[#333] transition-all group w-full`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${color.bg} flex items-center justify-center`}>
            <Building2 className={`w-5 h-5 ${color.text}`} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{account.account_name}</h3>
            <p className="text-gray-500 text-xs">{campaignCount} Kampagne{campaignCount !== 1 ? 'n' : ''}</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-0.5">Ausgaben</p>
          <p className={`text-lg font-bold ${color.text}`}>{fmt(account.spend, account.currency)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-0.5">Impressionen</p>
          <p className="text-lg font-bold text-white">{fmtNum(account.impressions)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-0.5">Klicks</p>
          <p className="text-sm font-semibold text-gray-300">{fmtRaw(account.clicks)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-0.5">CTR</p>
          <p className="text-sm font-semibold text-gray-300">{fmtPct(account.ctr)}</p>
        </div>
      </div>

      {/* Top campaigns preview */}
      {campaigns.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#262626]">
          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-2">Top Kampagnen</p>
          {campaigns.slice(0, 3).map((c) => (
            <div key={c.id} className="flex justify-between items-center py-1">
              <span className="text-gray-400 text-xs truncate max-w-[65%]">{c.name}</span>
              <span className={`text-xs font-medium ${color.text}`}>{fmt(c.insight.spend, c.currency)}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

/** Campaign card showing individual PPA spend as a KPI */
function CampaignKPICard({ campaign, color }: { campaign: Campaign; color: typeof ACCENT_COLORS[0] }) {
  return (
    <div className={`bg-[#141414] border border-[#262626] border-l-4 ${color.border} rounded-xl p-4`}>
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-white font-medium text-sm truncate max-w-[80%]" title={campaign.name}>
          {campaign.name}
        </h4>
        <span className="text-[10px] text-gray-500 bg-[#1a1a1a] px-1.5 py-0.5 rounded">
          {getObjectiveLabel(campaign.objective)}
        </span>
      </div>
      <div className={`text-2xl font-bold ${color.text} mb-3`}>
        {fmt(campaign.insight.spend, campaign.currency)}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-gray-500 text-[10px] uppercase">Impressionen</p>
          <p className="text-white text-xs font-semibold">{fmtNum(campaign.insight.impressions)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-[10px] uppercase">Reichweite</p>
          <p className="text-white text-xs font-semibold">{fmtNum(campaign.insight.reach)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-[10px] uppercase">Klicks</p>
          <p className="text-white text-xs font-semibold">{fmtRaw(campaign.insight.clicks)}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <div>
          <p className="text-gray-500 text-[10px] uppercase">CPC</p>
          <p className="text-gray-300 text-xs">{fmt(campaign.insight.cpc, campaign.currency)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-[10px] uppercase">CPM</p>
          <p className="text-gray-300 text-xs">{fmt(campaign.insight.cpm, campaign.currency)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-[10px] uppercase">CTR</p>
          <p className="text-gray-300 text-xs">{fmtPct(campaign.insight.ctr)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function AdsPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [data, setData] = useState<AdsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const monthOptions = useMemo(() => getMonthOptions(), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/advertising?month=${selectedMonth}`);
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`); }
      setData(await res.json());
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  const syncData = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch(`/api/advertising/sync?month=${selectedMonth}&manual=true`);
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Sync fehlgeschlagen'); }
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Sync-Fehler');
    } finally {
      setSyncing(false);
    }
  }, [selectedMonth, fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset account selection when month changes
  useEffect(() => { setSelectedAccount(null); }, [selectedMonth]);

  // Derived data
  const accountCampaigns = useMemo(() => {
    if (!data) return new Map<string, Campaign[]>();
    const map = new Map<string, Campaign[]>();
    for (const c of data.campaigns) {
      const key = c.account_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    // Sort campaigns within each account by spend desc
    for (const [, camps] of map) camps.sort((a, b) => b.insight.spend - a.insight.spend);
    return map;
  }, [data]);

  const selectedAccountData = useMemo(() => {
    if (!data || !selectedAccount) return null;
    const summary = data.accountSummaries.find(a => a.account_id === selectedAccount);
    const campaigns = accountCampaigns.get(selectedAccount) || [];
    return { summary, campaigns };
  }, [data, selectedAccount, accountCampaigns]);

  const sortedAccounts = useMemo(() => {
    if (!data) return [];
    return [...data.accountSummaries].sort((a, b) => b.spend - a.spend);
  }, [data]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            {selectedAccount ? (
              <button
                onClick={() => setSelectedAccount(null)}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Zurück zur Übersicht
              </button>
            ) : null}
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Megaphone className="w-8 h-8 text-purple-400" />
              {selectedAccount
                ? selectedAccountData?.summary?.account_name || 'Kunde'
                : 'Ads Performance'}
            </h1>
            <p className="text-gray-400 mt-1">
              {selectedAccount
                ? 'Kampagnen-Details & PPA-Ausgaben'
                : `${sortedAccounts.length} Kunden · ${data?.campaigns.length || 0} Kampagnen`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={syncData}
              disabled={loading || syncing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 hover:text-purple-300 transition-colors disabled:opacity-50 text-sm"
            >
              <Download className={`w-4 h-4 ${syncing ? 'animate-bounce' : ''}`} />
              {syncing ? 'Sync...' : 'Sync'}
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-lg bg-[#1a1a1a] border border-[#262626] text-gray-400 hover:text-white hover:border-purple-500/50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[#141414] border border-[#262626] text-white rounded-lg px-4 py-2 text-sm focus:border-purple-500 focus:outline-none"
            >
              {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* ─── Loading ─── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">{syncing ? 'Synchronisiere Ads-Daten...' : 'Lade Daten...'}</p>
            </div>
          </div>
        )}

        {/* ─── Error ─── */}
        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-red-400 font-medium mb-1">Fehler</h3>
                <p className="text-gray-400 text-sm">{error}</p>
                <button onClick={fetchData} className="mt-3 px-4 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors">
                  Erneut versuchen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Needs Sync ─── */}
        {data?.needsSync && !loading && !error && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-yellow-400 font-medium mb-1">Keine Daten für diesen Monat</h3>
                <p className="text-gray-400 text-sm">Klicke auf &quot;Sync&quot; um die Ads-Daten von Meta zu laden.</p>
                <button onClick={syncData} disabled={syncing} className="mt-3 px-4 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30 transition-colors flex items-center gap-2">
                  <Download className="w-4 h-4" /> Jetzt synchronisieren
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Synced At ─── */}
        {data?.synced_at && !loading && (
          <div className="text-xs text-gray-500 mb-6 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Zuletzt synchronisiert: {new Date(data.synced_at).toLocaleString('de-DE')}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ─── ALL CUSTOMERS OVERVIEW ─── */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {data && !loading && !data.needsSync && !selectedAccount && (
          <>
            {/* Global KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KPICard title="Gesamtausgaben" value={fmt(data.totals.totalSpend)} subtitle="Alle Kunden" icon={DollarSign} borderColor="border-l-purple-500" />
              <KPICard title="Impressionen" value={fmtNum(data.totals.totalImpressions)} subtitle={`CPM: ${fmt(data.totals.avgCPM)}`} icon={Eye} borderColor="border-l-blue-500" />
              <KPICard title="Reichweite" value={fmtNum(data.totals.totalReach)} subtitle="Unique Users" icon={Users} borderColor="border-l-green-500" />
              <KPICard title="Klicks" value={fmtNum(data.totals.totalClicks)} subtitle={`CPC: ${fmt(data.totals.avgCPC)} · CTR: ${fmtPct(data.totals.avgCTR)}`} icon={MousePointer} borderColor="border-l-yellow-500" />
            </div>

            {/* Customer Grid */}
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              Kunden ({sortedAccounts.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
              {sortedAccounts.map((account, i) => (
                <CustomerCard
                  key={account.account_id}
                  account={account}
                  campaigns={accountCampaigns.get(account.account_id) || []}
                  color={ACCENT_COLORS[i % ACCENT_COLORS.length]}
                  onClick={() => setSelectedAccount(account.account_id)}
                />
              ))}
            </div>

            {/* Spend Distribution */}
            {sortedAccounts.length > 1 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  Ausgabenverteilung nach Kunde
                </h2>
                <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
                  <div className="space-y-4">
                    {sortedAccounts.map((account, i) => {
                      const maxSpend = sortedAccounts[0]?.spend || 1;
                      const pct = (account.spend / maxSpend) * 100;
                      const color = ACCENT_COLORS[i % ACCENT_COLORS.length];
                      return (
                        <button
                          key={account.account_id}
                          onClick={() => setSelectedAccount(account.account_id)}
                          className="w-full text-left hover:bg-[#1a1a1a] rounded-lg p-2 -m-2 transition-colors"
                        >
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-sm text-gray-300 truncate max-w-[60%]">{account.account_name}</span>
                            <span className={`text-sm font-medium ${color.text}`}>{fmt(account.spend, account.currency)}</span>
                          </div>
                          <div className="h-3 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full bg-gradient-to-r ${color.bar}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ─── SINGLE CUSTOMER DETAIL VIEW ─── */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {data && !loading && !data.needsSync && selectedAccount && selectedAccountData && (
          <>
            {/* Customer KPIs */}
            {selectedAccountData.summary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <KPICard
                  title="Ausgaben"
                  value={fmt(selectedAccountData.summary.spend, selectedAccountData.summary.currency)}
                  subtitle="Gesamtausgaben"
                  icon={DollarSign}
                  borderColor="border-l-purple-500"
                />
                <KPICard
                  title="Impressionen"
                  value={fmtNum(selectedAccountData.summary.impressions)}
                  subtitle={`CPM: ${fmt(selectedAccountData.summary.cpm, selectedAccountData.summary.currency)}`}
                  icon={Eye}
                  borderColor="border-l-blue-500"
                />
                <KPICard
                  title="Reichweite"
                  value={fmtNum(selectedAccountData.summary.reach)}
                  subtitle="Unique Users"
                  icon={Users}
                  borderColor="border-l-green-500"
                />
                <KPICard
                  title="Klicks"
                  value={fmtRaw(selectedAccountData.summary.clicks)}
                  subtitle={`CPC: ${fmt(selectedAccountData.summary.cpc, selectedAccountData.summary.currency)} · CTR: ${fmtPct(selectedAccountData.summary.ctr)}`}
                  icon={MousePointer}
                  borderColor="border-l-yellow-500"
                />
              </div>
            )}

            {/* Secondary KPIs */}
            {selectedAccountData.summary && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-orange-400" />
                    <span className="text-gray-400 text-xs uppercase tracking-wider">Conversions</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{fmtRaw(selectedAccountData.summary.conversions)}</div>
                </div>
                <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    <span className="text-gray-400 text-xs uppercase tracking-wider">Leads</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{fmtRaw(selectedAccountData.summary.leads)}</div>
                </div>
                <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-pink-400" />
                    <span className="text-gray-400 text-xs uppercase tracking-wider">Kampagnen</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{selectedAccountData.campaigns.length}</div>
                </div>
              </div>
            )}

            {/* ─── PPA Kampagnen als Einzelkennzahlen ─── */}
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-purple-400" />
              PPA-Ausgaben pro Kampagne
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              Jede Kampagne als einzelne Kennzahl mit Ausgaben und Performance-Metriken
            </p>

            {selectedAccountData.campaigns.length === 0 ? (
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-8 text-center mb-8">
                <Megaphone className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Keine Kampagnen in diesem Zeitraum</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
                {selectedAccountData.campaigns.map((campaign) => {
                  const idx = sortedAccounts.findIndex(a => a.account_id === selectedAccount);
                  const color = ACCENT_COLORS[idx >= 0 ? idx % ACCENT_COLORS.length : 0];
                  return (
                    <CampaignKPICard key={campaign.id} campaign={campaign} color={color} />
                  );
                })}
              </div>
            )}

            {/* Spend Distribution within customer */}
            {selectedAccountData.campaigns.length > 1 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  Ausgabenverteilung
                </h2>
                <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
                  <div className="space-y-4">
                    {selectedAccountData.campaigns.map((campaign) => {
                      const maxSpend = selectedAccountData.campaigns[0]?.insight.spend || 1;
                      const pct = (campaign.insight.spend / maxSpend) * 100;
                      const idx = sortedAccounts.findIndex(a => a.account_id === selectedAccount);
                      const color = ACCENT_COLORS[idx >= 0 ? idx % ACCENT_COLORS.length : 0];
                      return (
                        <div key={campaign.id}>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-sm text-gray-300 truncate max-w-[60%]" title={campaign.name}>{campaign.name}</span>
                            <span className={`text-sm font-medium ${color.text}`}>{fmt(campaign.insight.spend, campaign.currency)}</span>
                          </div>
                          <div className="h-3 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full bg-gradient-to-r ${color.bar}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── Empty state ─── */}
        {!data && !loading && !error && (
          <div className="text-center py-20">
            <Megaphone className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-white text-lg font-medium mb-2">Keine Ads-Daten</h3>
            <p className="text-gray-400 text-sm">Stelle sicher, dass die Meta Ads API korrekt konfiguriert ist.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
