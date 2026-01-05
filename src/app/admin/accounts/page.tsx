'use client';

import { useState, useEffect } from 'react';

interface Customer {
  customer_id: number;
  name: string;
}

interface Account {
  id: number;
  customer_id: number | null;
  platform: 'facebook' | 'instagram';
  account_id: string;
  account_name: string | null;
  is_active: boolean;
  customer_name?: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'facebook' | 'instagram' | 'unassigned'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [accountsRes, customersRes] = await Promise.all([
        fetch('/api/admin/accounts'),
        fetch('/api/admin/customers'),
      ]);
      const accountsData = await accountsRes.json();
      const customersData = await customersRes.json();
      setAccounts(accountsData.accounts || []);
      setCustomers(customersData.customers || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign(accountId: number, customerId: string) {
    try {
      await fetch(`/api/admin/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId === '' ? null : parseInt(customerId) }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to assign account:', error);
    }
  }

  const filteredAccounts = accounts.filter((account) => {
    if (filter === 'all') return true;
    if (filter === 'unassigned') return !account.customer_id;
    return account.platform === filter;
  });

  const stats = {
    total: accounts.length,
    facebook: accounts.filter(a => a.platform === 'facebook').length,
    instagram: accounts.filter(a => a.platform === 'instagram').length,
    unassigned: accounts.filter(a => !a.customer_id).length,
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse text-gray-400">Laden...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Accounts</h1>
        <p className="text-gray-400 mt-1">Weise Facebook & Instagram Accounts deinen Kunden zu</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-[#111] border border-[#222] rounded-xl p-4">
          <p className="text-gray-400 text-sm">Gesamt</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-4">
          <p className="text-gray-400 text-sm">Facebook</p>
          <p className="text-2xl font-bold text-blue-400">{stats.facebook}</p>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-4">
          <p className="text-gray-400 text-sm">Instagram</p>
          <p className="text-2xl font-bold text-pink-400">{stats.instagram}</p>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-4">
          <p className="text-gray-400 text-sm">Nicht zugeordnet</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.unassigned}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {(['all', 'facebook', 'instagram', 'unassigned'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[#c8ff00] text-black'
                : 'bg-[#222] text-gray-400 hover:bg-[#333]'
            }`}
          >
            {f === 'all' && 'Alle'}
            {f === 'facebook' && '📘 Facebook'}
            {f === 'instagram' && '📸 Instagram'}
            {f === 'unassigned' && '⚠️ Nicht zugeordnet'}
          </button>
        ))}
      </div>

      {/* Accounts Table */}
      <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0a0a0a]">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Platform</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Account</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Account ID</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Zugeordnet zu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  Keine Accounts gefunden. Führe den "discover" Modus im Collector aus.
                </td>
              </tr>
            ) : (
              filteredAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-[#0a0a0a]">
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      account.platform === 'facebook'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-pink-500/20 text-pink-400'
                    }`}>
                      {account.platform === 'facebook' ? '📘 Facebook' : '📸 Instagram'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white font-medium">
                    {account.account_name || account.account_id}
                  </td>
                  <td className="px-6 py-4 text-gray-400 font-mono text-sm">
                    {account.account_id}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={account.customer_id || ''}
                      onChange={(e) => handleAssign(account.id, e.target.value)}
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white focus:border-[#c8ff00] focus:outline-none"
                    >
                      <option value="">-- Nicht zugeordnet --</option>
                      {customers.map((customer) => (
                        <option key={customer.customer_id} value={customer.customer_id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
