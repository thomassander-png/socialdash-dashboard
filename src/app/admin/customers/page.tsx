'use client';

import { useState, useEffect } from 'react';

interface Customer {
  customer_id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', slug: '' });

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    try {
      const res = await fetch('/api/admin/customers');
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSeedCustomers() {
    setSeeding(true);
    try {
      const res = await fetch('/api/admin/customers/seed', { method: 'POST' });
      const data = await res.json();
      alert(`${data.count} Kunden importiert!`);
      fetchCustomers();
    } catch (error) {
      console.error('Failed to seed customers:', error);
      alert('Fehler beim Importieren');
    } finally {
      setSeeding(false);
    }
  }

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.slug) return;
    
    try {
      await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer),
      });
      setNewCustomer({ name: '', slug: '' });
      fetchCustomers();
    } catch (error) {
      console.error('Failed to create customer:', error);
    }
  }

  async function handleToggleStatus(customerId: number, currentStatus: boolean) {
    try {
      await fetch(`/api/admin/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      fetchCustomers();
    } catch (error) {
      console.error('Failed to update customer:', error);
    }
  }

  async function handleDelete(customerId: number) {
    if (!confirm('Kunden wirklich löschen?')) return;
    
    try {
      await fetch(`/api/admin/customers/${customerId}`, { method: 'DELETE' });
      fetchCustomers();
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse text-gray-400">Laden...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Kunden</h1>
          <p className="text-gray-400 mt-1">Verwalte deine Kunden für das Reporting</p>
        </div>
        <button
          onClick={handleSeedCustomers}
          disabled={seeding}
          className="px-4 py-2 bg-[#c8ff00] text-black font-semibold rounded-lg hover:bg-[#b8ef00] disabled:opacity-50 transition-colors"
        >
          {seeding ? 'Importiere...' : '📥 Kunden importieren'}
        </button>
      </div>

      {/* New Customer Form */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Neuen Kunden anlegen</h2>
        <form onSubmit={handleCreateCustomer} className="flex gap-4">
          <input
            type="text"
            placeholder="Name"
            value={newCustomer.name}
            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
            className="flex-1 px-4 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:border-[#c8ff00] focus:outline-none"
          />
          <input
            type="text"
            placeholder="Slug (z.B. mein-kunde)"
            value={newCustomer.slug}
            onChange={(e) => setNewCustomer({ ...newCustomer, slug: e.target.value })}
            className="flex-1 px-4 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:border-[#c8ff00] focus:outline-none"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-[#c8ff00] text-black font-semibold rounded-lg hover:bg-[#b8ef00] transition-colors"
          >
            Anlegen
          </button>
        </form>
      </div>

      {/* Customers Table */}
      <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0a0a0a]">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Slug</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Erstellt</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Keine Kunden vorhanden. Klicke auf &quot;Kunden importieren&quot; um die Standard-Kunden anzulegen.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.customer_id} className="hover:bg-[#0a0a0a]">
                  <td className="px-6 py-4 text-white font-medium">{customer.name}</td>
                  <td className="px-6 py-4 text-gray-400 font-mono text-sm">{customer.slug}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      customer.is_active 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {customer.is_active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(customer.created_at).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleToggleStatus(customer.customer_id, customer.is_active)}
                      className="px-3 py-1 text-sm bg-[#222] text-gray-300 rounded hover:bg-[#333] transition-colors"
                    >
                      {customer.is_active ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button
                      onClick={() => handleDelete(customer.customer_id)}
                      className="px-3 py-1 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                    >
                      Löschen
                    </button>
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
