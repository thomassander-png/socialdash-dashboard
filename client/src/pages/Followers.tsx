import { useState, useMemo } from "react";
import { useSearchParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Users,
  UserPlus,
  UserMinus,
  BarChart3,
  Facebook,
  Instagram,
} from "lucide-react";

// Helper to format numbers with thousands separator
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('de-DE').format(num);
};

// Helper to format percentage
const formatPercent = (num: number): string => {
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
};

// Helper to get month options
const getMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  return options;
};

// KPI Card Component
interface KPICardProps {
  title: string;
  value: number;
  change?: number;
  changePercent?: number;
  icon: React.ReactNode;
  loading?: boolean;
  subtitle?: string;
}

function KPICard({ title, value, change, changePercent, icon, loading, subtitle }: KPICardProps) {
  if (loading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32" />
        </CardContent>
      </Card>
    );
  }

  const isPositive = (change ?? 0) >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColor = isPositive ? 'text-green-500' : 'text-red-500';

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-zinc-400">{title}</span>
          <span className="text-zinc-500">{icon}</span>
        </div>
        <div className="text-3xl font-bold text-white mb-1">
          {formatNumber(value)}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>
            {changePercent !== undefined && (
              <span className="text-zinc-500">({formatPercent(changePercent)})</span>
            )}
          </div>
        )}
        {subtitle && (
          <div className="text-xs text-zinc-500 mt-1">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  );
}

// Follower Growth Bar Component
interface FollowerGrowthBarProps {
  accountName: string;
  platform: 'facebook' | 'instagram';
  currentFollowers: number;
  growth: number;
  growthPercent: number;
}

function FollowerGrowthBar({ accountName, platform, currentFollowers, growth, growthPercent }: FollowerGrowthBarProps) {
  const isPositive = growth >= 0;
  const PlatformIcon = platform === 'facebook' ? Facebook : Instagram;
  const platformColor = platform === 'facebook' ? 'text-blue-500' : 'text-pink-500';
  const growthColor = isPositive ? 'bg-green-500' : 'bg-red-500';
  const growthTextColor = isPositive ? 'text-green-500' : 'text-red-500';

  // Calculate bar width (max 100%, min 5% for visibility)
  const maxGrowth = 500; // Assume max growth for scaling
  const barWidth = Math.min(100, Math.max(5, (Math.abs(growth) / maxGrowth) * 100));

  return (
    <div className="p-4 bg-zinc-900/30 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PlatformIcon className={`w-5 h-5 ${platformColor}`} />
          <span className="font-medium text-white">{accountName}</span>
        </div>
        <Badge variant="outline" className="text-zinc-400">
          {formatNumber(currentFollowers)} Follower
        </Badge>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={`h-full ${growthColor} rounded-full transition-all duration-500`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
        <div className={`text-right min-w-[100px] ${growthTextColor}`}>
          <div className="font-bold">
            {growth >= 0 ? '+' : ''}{formatNumber(growth)}
          </div>
          <div className="text-xs text-zinc-500">
            {formatPercent(growthPercent)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Daily Chart Component (Simple SVG)
interface DailyChartProps {
  data: Array<{ date: string; followers_count: number; daily_change: number }>;
  loading?: boolean;
}

function DailyChart({ data, loading }: DailyChartProps) {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-500">
        Keine Daten für diesen Zeitraum verfügbar
      </div>
    );
  }

  const maxFollowers = Math.max(...data.map(d => d.followers_count));
  const minFollowers = Math.min(...data.map(d => d.followers_count));
  const range = maxFollowers - minFollowers || 1;

  const width = 800;
  const height = 200;
  const padding = 40;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding);
    const y = height - padding - ((d.followers_count - minFollowers) / range) * (height - 2 * padding);
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={i}
            x1={padding}
            y1={height - padding - ratio * (height - 2 * padding)}
            x2={width - padding}
            y2={height - padding - ratio * (height - 2 * padding)}
            stroke="#27272a"
            strokeWidth="1"
          />
        ))}

        {/* Line chart */}
        <path
          d={pathD}
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
          className="drop-shadow-lg"
        />

        {/* Area under line */}
        <path
          d={`${pathD} L ${points[points.length - 1]?.x || 0} ${height - padding} L ${padding} ${height - padding} Z`}
          fill="url(#gradient)"
          opacity="0.3"
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#22c55e"
            className="cursor-pointer hover:r-6 transition-all"
          >
            <title>{`${p.date}: ${formatNumber(p.followers_count)} (${p.daily_change >= 0 ? '+' : ''}${p.daily_change})`}</title>
          </circle>
        ))}

        {/* Y-axis labels */}
        <text x={padding - 5} y={padding} textAnchor="end" fill="#71717a" fontSize="10">
          {formatNumber(maxFollowers)}
        </text>
        <text x={padding - 5} y={height - padding} textAnchor="end" fill="#71717a" fontSize="10">
          {formatNumber(minFollowers)}
        </text>

        {/* X-axis labels */}
        {data.length > 0 && (
          <>
            <text x={padding} y={height - 10} textAnchor="start" fill="#71717a" fontSize="10">
              {data[0]?.date?.split('-').slice(1).join('.')}
            </text>
            <text x={width - padding} y={height - 10} textAnchor="end" fill="#71717a" fontSize="10">
              {data[data.length - 1]?.date?.split('-').slice(1).join('.')}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

// Monthly Trend Chart Component
interface MonthlyTrendChartProps {
  data: Array<{ month: string; net_growth: number; growth_percentage: number }>;
  loading?: boolean;
}

function MonthlyTrendChart({ data, loading }: MonthlyTrendChartProps) {
  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-zinc-500">
        Keine historischen Daten verfügbar
      </div>
    );
  }

  // Reverse to show oldest first
  const sortedData = [...data].reverse();
  const maxGrowth = Math.max(...sortedData.map(d => Math.abs(d.net_growth)));
  const barHeight = 24;
  const gap = 8;

  return (
    <div className="space-y-2">
      {sortedData.slice(-6).map((item, i) => {
        const isPositive = item.net_growth >= 0;
        const barWidth = maxGrowth > 0 ? (Math.abs(item.net_growth) / maxGrowth) * 100 : 0;
        const barColor = isPositive ? 'bg-green-500' : 'bg-red-500';
        const textColor = isPositive ? 'text-green-500' : 'text-red-500';

        return (
          <div key={item.month} className="flex items-center gap-3">
            <div className="w-20 text-xs text-zinc-500">
              {new Date(item.month + '-01').toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })}
            </div>
            <div className="flex-1 h-6 bg-zinc-800 rounded overflow-hidden">
              <div 
                className={`h-full ${barColor} rounded transition-all duration-300`}
                style={{ width: `${Math.max(barWidth, 2)}%` }}
              />
            </div>
            <div className={`w-20 text-right text-sm font-medium ${textColor}`}>
              {item.net_growth >= 0 ? '+' : ''}{formatNumber(item.net_growth)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Followers() {
  const searchParams = useSearchParams()[0];
  const monthOptions = useMemo(() => getMonthOptions(), []);
  
  // Get month from URL or default to current month
  const defaultMonth = monthOptions[0]?.value || '';
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const urlMonth = searchParams.get('month');
    return urlMonth || defaultMonth;
  });

  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<'facebook' | 'instagram'>('instagram');

  // Fetch customers for filter
  const { data: customers, isLoading: customersLoading } = trpc.admin.customers.list.useQuery({});

  // Fetch all accounts follower growth
  const { data: allAccountsGrowth, isLoading: growthLoading } = trpc.followers.allAccounts.useQuery({
    month: selectedMonth,
  });

  // Fetch daily data for selected account
  const { data: dailyData, isLoading: dailyLoading } = trpc.followers.dailyData.useQuery(
    {
      accountId: selectedAccount || '',
      platform: selectedPlatform,
      month: selectedMonth,
    },
    { enabled: !!selectedAccount }
  );

  // Fetch monthly history for selected account
  const { data: monthlyHistory, isLoading: historyLoading } = trpc.followers.monthlyHistory.useQuery(
    {
      accountId: selectedAccount || '',
      platform: selectedPlatform,
      months: 12,
    },
    { enabled: !!selectedAccount }
  );

  // Filter accounts by customer if selected
  const filteredAccounts = useMemo(() => {
    if (!allAccountsGrowth) return [];
    if (selectedCustomer === 'all') return allAccountsGrowth;
    
    // For now, return all - customer filtering would need customer_accounts join
    return allAccountsGrowth;
  }, [allAccountsGrowth, selectedCustomer]);

  // Calculate totals
  const totals = useMemo(() => {
    if (!filteredAccounts || filteredAccounts.length === 0) {
      return {
        totalFollowers: 0,
        totalGrowth: 0,
        avgGrowthPercent: 0,
        positiveAccounts: 0,
        negativeAccounts: 0,
      };
    }

    const totalFollowers = filteredAccounts.reduce((sum, a) => sum + a.current_followers, 0);
    const totalGrowth = filteredAccounts.reduce((sum, a) => sum + a.follower_growth, 0);
    const avgGrowthPercent = filteredAccounts.reduce((sum, a) => sum + a.growth_percentage, 0) / filteredAccounts.length;
    const positiveAccounts = filteredAccounts.filter(a => a.follower_growth > 0).length;
    const negativeAccounts = filteredAccounts.filter(a => a.follower_growth < 0).length;

    return { totalFollowers, totalGrowth, avgGrowthPercent, positiveAccounts, negativeAccounts };
  }, [filteredAccounts]);

  // Handle account selection for detailed view
  const handleAccountClick = (accountId: string, platform: 'facebook' | 'instagram') => {
    setSelectedAccount(accountId);
    setSelectedPlatform(platform);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-green-500" />
              Follower Wachstum
            </h1>
            <p className="text-zinc-400 mt-1">
              Netto-Zuwachs pro Monat für alle Accounts
            </p>
          </div>

          <div className="flex gap-3">
            {/* Customer Filter */}
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Alle Kunden" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">Alle Kunden</SelectItem>
                {customers?.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Month Filter */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Monat wählen" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <KPICard
            title="Gesamt Follower"
            value={totals.totalFollowers}
            icon={<Users className="w-5 h-5" />}
            loading={growthLoading}
            subtitle="Alle Plattformen"
          />
          <KPICard
            title="Netto Zuwachs"
            value={totals.totalGrowth}
            change={totals.totalGrowth}
            changePercent={totals.avgGrowthPercent}
            icon={totals.totalGrowth >= 0 ? <UserPlus className="w-5 h-5" /> : <UserMinus className="w-5 h-5" />}
            loading={growthLoading}
            subtitle={selectedMonth}
          />
          <KPICard
            title="Ø Wachstum"
            value={Math.round(totals.avgGrowthPercent * 100) / 100}
            icon={<BarChart3 className="w-5 h-5" />}
            loading={growthLoading}
            subtitle="Prozent"
          />
          <KPICard
            title="Gewachsen"
            value={totals.positiveAccounts}
            icon={<TrendingUp className="w-5 h-5 text-green-500" />}
            loading={growthLoading}
            subtitle="Accounts"
          />
          <KPICard
            title="Geschrumpft"
            value={totals.negativeAccounts}
            icon={<TrendingDown className="w-5 h-5 text-red-500" />}
            loading={growthLoading}
            subtitle="Accounts"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Account List */}
          <div className="lg:col-span-2">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-500" />
                  Follower Wachstum nach Account
                </CardTitle>
                <CardDescription>
                  Klicken Sie auf einen Account für Details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {growthLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : filteredAccounts && filteredAccounts.length > 0 ? (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {filteredAccounts.map((account) => (
                      <div
                        key={`${account.platform}-${account.account_id}`}
                        onClick={() => handleAccountClick(account.account_id, account.platform)}
                        className={`cursor-pointer transition-all ${
                          selectedAccount === account.account_id && selectedPlatform === account.platform
                            ? 'ring-2 ring-green-500'
                            : ''
                        }`}
                      >
                        <FollowerGrowthBar
                          accountName={account.account_name}
                          platform={account.platform}
                          currentFollowers={account.current_followers}
                          growth={account.follower_growth}
                          growthPercent={account.growth_percentage}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-zinc-500">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Keine Follower-Daten für diesen Monat verfügbar</p>
                    <p className="text-sm mt-2">
                      Stellen Sie sicher, dass der Collector Follower-Daten sammelt
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detail View */}
          <div className="space-y-6">
            {/* Daily Chart */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg">Tagesverlauf</CardTitle>
                <CardDescription>
                  {selectedAccount 
                    ? `Follower-Entwicklung im ${new Date(selectedMonth + '-01').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}`
                    : 'Wählen Sie einen Account aus'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedAccount ? (
                  <DailyChart data={dailyData || []} loading={dailyLoading} />
                ) : (
                  <div className="h-64 flex items-center justify-center text-zinc-500">
                    <div className="text-center">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Account auswählen</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Trend */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg">Monatlicher Trend</CardTitle>
                <CardDescription>
                  Netto-Zuwachs der letzten 6 Monate
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedAccount ? (
                  <MonthlyTrendChart 
                    data={monthlyHistory || []} 
                    loading={historyLoading} 
                  />
                ) : (
                  <div className="h-48 flex items-center justify-center text-zinc-500">
                    <div className="text-center">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Account auswählen</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legend */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg">Legende</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-500 rounded" />
                  <span className="text-sm text-zinc-400">Follower gewonnen</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-red-500 rounded" />
                  <span className="text-sm text-zinc-400">Follower verloren</span>
                </div>
                <div className="flex items-center gap-3">
                  <Facebook className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-zinc-400">Facebook Page</span>
                </div>
                <div className="flex items-center gap-3">
                  <Instagram className="w-4 h-4 text-pink-500" />
                  <span className="text-sm text-zinc-400">Instagram Account</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
