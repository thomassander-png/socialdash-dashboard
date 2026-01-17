'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, Facebook, Instagram } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { DashboardLayout } from '@/components/DashboardLayout';

interface Customer {
  id: number;
  name: string;
  slug: string;
}

interface FollowerSummary {
  month: string;
  fb: number;
  ig: number;
  total: number;
}

interface FollowerDetail {
  month: string;
  platform: string;
  account_id: string;
  account_name: string;
  start_followers: number;
  end_followers: number;
  net_change: number;
  percent_change: number;
}

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString('de-DE');
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
}

function FollowersContent() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [summary, setSummary] = useState<FollowerSummary[]>([]);
  const [details, setDetails] = useState<FollowerDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/customers')
      .then(res => res.json())
      .then(data => setCustomers(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ months: '12' });
    if (selectedCustomer !== 'all') params.append('customer', selectedCustomer);
    
    fetch(`/api/followers?${params}`)
      .then(res => res.json())
      .then(data => {
        setSummary(data.summary || []);
        setDetails(data.details || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedCustomer]);

  // Calculate totals for the current period
  const totalNetChange = summary.reduce((acc, s) => acc + s.total, 0);
  const fbNetChange = summary.reduce((acc, s) => acc + s.fb, 0);
  const igNetChange = summary.reduce((acc, s) => acc + s.ig, 0);

  // Prepare chart data (reverse for chronological order)
  const chartData = [...summary].reverse().map(s => ({
    month: formatMonth(s.month),
    Facebook: s.fb,
    Instagram: s.ig,
    total: s.total,
  }));

  // Get latest month details
  const latestMonth = summary[0]?.month;
  const latestDetails = details.filter(d => d.month === latestMonth);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="text-[#84cc16]" size={32} />
            Follower Wachstum
          </h1>
          <p className="text-gray-500 mt-1">Netto-Zuwachs pro Monat für Facebook und Instagram</p>
        </div>
        
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
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#84cc16]"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-sm uppercase tracking-wider">Netto Gesamt (12M)</span>
                <Users className="text-gray-500" size={20} />
              </div>
              <div className={`text-3xl font-bold flex items-center gap-2 ${totalNetChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalNetChange >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                {totalNetChange >= 0 ? '+' : ''}{formatNumber(totalNetChange)}
              </div>
              <p className="text-gray-500 text-sm mt-1">Letzte 12 Monate</p>
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-sm uppercase tracking-wider">Facebook Netto</span>
                <Facebook className="text-blue-500" size={20} />
              </div>
              <div className={`text-3xl font-bold flex items-center gap-2 ${fbNetChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {fbNetChange >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                {fbNetChange >= 0 ? '+' : ''}{formatNumber(fbNetChange)}
              </div>
              <p className="text-gray-500 text-sm mt-1">Letzte 12 Monate</p>
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-sm uppercase tracking-wider">Instagram Netto</span>
                <Instagram className="text-pink-500" size={20} />
              </div>
              <div className={`text-3xl font-bold flex items-center gap-2 ${igNetChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {igNetChange >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                {igNetChange >= 0 ? '+' : ''}{formatNumber(igNetChange)}
              </div>
              <p className="text-gray-500 text-sm mt-1">Letzte 12 Monate</p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-6">Monatlicher Netto-Zuwachs</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="month" stroke="#a3a3a3" />
                  <YAxis stroke="#a3a3a3" tickFormatter={(value) => formatNumber(value)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f1f1f', border: '1px solid #262626', borderRadius: '8px' }}
                    labelStyle={{ color: '#ededed' }}
                    formatter={(value) => [formatNumber(value as number), '']}
                  />
                  <Legend />
                  <Bar dataKey="Facebook" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Instagram" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-500 py-12">
                Keine Follower-Daten verfügbar
              </div>
            )}
          </div>

          {/* Monthly Details Table */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Monatliche Übersicht</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#262626]">
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Monat</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium">Facebook</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium">Instagram</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium">Gesamt</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((row) => (
                    <tr key={row.month} className="border-b border-[#262626] hover:bg-[#1f1f1f]">
                      <td className="py-3 px-4 text-white">{formatMonth(row.month)}</td>
                      <td className={`py-3 px-4 text-right font-medium ${row.fb >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {row.fb >= 0 ? '+' : ''}{formatNumber(row.fb)}
                      </td>
                      <td className={`py-3 px-4 text-right font-medium ${row.ig >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {row.ig >= 0 ? '+' : ''}{formatNumber(row.ig)}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${row.total >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {row.total >= 0 ? '+' : ''}{formatNumber(row.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Account Details for Latest Month */}
          {latestDetails.length > 0 && (
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 mt-8">
              <h2 className="text-xl font-bold text-white mb-6">
                Account-Details für {latestMonth ? formatMonth(latestMonth) : 'Aktueller Monat'}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#262626]">
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">Account</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">Plattform</th>
                      <th className="text-right py-3 px-4 text-gray-500 font-medium">Start</th>
                      <th className="text-right py-3 px-4 text-gray-500 font-medium">Ende</th>
                      <th className="text-right py-3 px-4 text-gray-500 font-medium">Netto</th>
                      <th className="text-right py-3 px-4 text-gray-500 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestDetails.map((row, idx) => (
                      <tr key={idx} className="border-b border-[#262626] hover:bg-[#1f1f1f]">
                        <td className="py-3 px-4 text-white">{row.account_name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            row.platform === 'facebook' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'
                          }`}>
                            {row.platform === 'facebook' ? 'Facebook' : 'Instagram'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-400">{formatNumber(row.start_followers)}</td>
                        <td className="py-3 px-4 text-right text-white">{formatNumber(row.end_followers)}</td>
                        <td className={`py-3 px-4 text-right font-medium ${row.net_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {row.net_change >= 0 ? '+' : ''}{formatNumber(row.net_change)}
                        </td>
                        <td className={`py-3 px-4 text-right ${row.percent_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {row.percent_change >= 0 ? '+' : ''}{row.percent_change.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function FollowersPage() {
  return (
    <DashboardLayout>
      <FollowersContent />
    </DashboardLayout>
  );
}
