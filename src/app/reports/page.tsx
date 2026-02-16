'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';

interface Customer {
  customer_id: number;
  name: string;
  slug: string;
  is_active: boolean;
}

function ReportsContent() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    // Default to previous month (most common use case for monthly reporting)
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    return { value, label };
  });

  // Fetch customers
  useEffect(() => {
    async function fetchCustomers() {
      try {
        const response = await fetch('/api/customers');
        if (response.ok) {
          const data = await response.json();
          setCustomers((data.customers || []).filter((c: Customer) => c.is_active !== false));
        }
      } catch (err) {
        console.error('Failed to fetch customers:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMonthLabel = (monthValue: string) => {
    const [year, m] = monthValue.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1, 1);
    return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  };

  const handleGenerateReport = async (customerSlug: string, customerName: string) => {
    setGeneratingFor(customerSlug);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/reports/${customerSlug}?month=${selectedMonth}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Report konnte nicht generiert werden');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const monthLabel = getMonthLabel(selectedMonth).replace(' ', '_');
      a.download = `${customerName.replace(/\s+/g, '_')}_Report_${monthLabel}.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`Report f\u00fcr ${customerName} erfolgreich generiert!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleGenerateAll = async () => {
    setGeneratingAll(true);
    setError(null);
    setSuccess(null);
    let successCount = 0;
    let failCount = 0;

    for (const customer of filteredCustomers) {
      const slug = customer.slug || customer.name.toLowerCase().replace(/\s+/g, '-');
      try {
        setGeneratingFor(slug);
        const response = await fetch(`/api/reports/${slug}?month=${selectedMonth}`);
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const monthLabel = getMonthLabel(selectedMonth).replace(' ', '_');
          a.download = `${customer.name.replace(/\s+/g, '_')}_Report_${monthLabel}.pptx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          successCount++;
        } else {
          failCount++;
        }
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch {
        failCount++;
      }
    }

    setGeneratingFor(null);
    setGeneratingAll(false);
    setSuccess(`${successCount} Reports generiert${failCount > 0 ? `, ${failCount} fehlgeschlagen` : ''}`);
  };

  // Customer brand colors (fallback)
  const brandColors: Record<string, string> = {
    'andskincare': '#A8D65C',
    'contipark': '#0066CC',
    'captrain-deutschland': '#00A651',
    'pelikan': '#003399',
    'herlitz': '#E31937',
    'asphericon': '#00B4D8',
    'fensterart': '#8B4513',
    'famefact-gmbh': '#84CC16',
    'vergleich.org': '#FF6B35',
  };

  const getColor = (slug: string) => brandColors[slug] || '#84CC16';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-2xl">📄</span> Monatliche Reports
          </h1>
          <p className="text-gray-400 mt-1">
            Generiere kundenspezifische PowerPoint-Reports im famefact-Design inkl. Facebook, Instagram & Paid Ads.
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-[#1e1e2e] rounded-xl p-4 border border-gray-700 flex flex-col md:flex-row gap-4 items-start md:items-end">
        {/* Month Selector */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-400 mb-1.5">Berichtsmonat</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full bg-[#2d2d44] text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-[#84cc16] focus:outline-none text-sm"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-400 mb-1.5">Kunde suchen</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Kundenname eingeben..."
            className="w-full bg-[#2d2d44] text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-[#84cc16] focus:outline-none text-sm placeholder-gray-500"
          />
        </div>

        {/* Generate All Button */}
        <button
          onClick={handleGenerateAll}
          disabled={generatingAll || filteredCustomers.length === 0}
          className="bg-gradient-to-r from-[#84cc16] to-[#65a30d] text-black font-semibold py-2.5 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
        >
          {generatingAll ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generiere alle...
            </span>
          ) : (
            `Alle ${filteredCustomers.length} Reports generieren`
          )}
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Customer Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-[#1e1e2e] rounded-xl p-5 border border-gray-700 animate-pulse">
              <div className="h-6 bg-gray-700 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-700 rounded w-1/2 mb-4" />
              <div className="h-10 bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCustomers.map((customer) => {
            const slug = customer.slug || customer.name.toLowerCase().replace(/\s+/g, '-');
            const color = getColor(slug);
            const isGenerating = generatingFor === slug;

            return (
              <div
                key={customer.customer_id}
                className="bg-[#1e1e2e] rounded-xl p-5 border border-gray-700 hover:border-gray-500 transition-all group"
              >
                {/* Customer Name with Color Accent */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <h3 className="text-white font-semibold text-sm truncate">
                    {customer.name}
                  </h3>
                </div>

                {/* Platform Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <span className="px-2 py-0.5 bg-blue-500/15 text-blue-400 rounded text-[10px] font-medium">FB</span>
                  <span className="px-2 py-0.5 bg-pink-500/15 text-pink-400 rounded text-[10px] font-medium">IG</span>
                  <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded text-[10px] font-medium">Ads</span>
                  <span className="px-2 py-0.5 bg-gray-500/15 text-gray-400 rounded text-[10px] font-medium">PPTX</span>
                </div>

                {/* Generate Button */}
                <button
                  onClick={() => handleGenerateReport(slug, customer.name)}
                  disabled={isGenerating || generatingAll}
                  className="w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: isGenerating ? 'transparent' : `${color}20`,
                    color: color,
                    border: `1px solid ${color}40`,
                  }}
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generiere...
                    </span>
                  ) : (
                    'Report generieren'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-[#1e1e2e] rounded-lg p-4 border border-gray-700">
        <h4 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
          <span>ℹ️</span> Hinweise
        </h4>
        <ul className="text-gray-400 text-xs space-y-1">
          <li>Jeder Report enth\u00e4lt automatisch: Facebook KPIs, Instagram KPIs, Top Posts und Paid Ads Performance (sofern vorhanden)</li>
          <li>Reports werden im famefact-Design als PowerPoint (.pptx) generiert</li>
          <li>Die Herlitz-Kampagnen werden korrekt aus dem Pelikan-Konto zugeordnet</li>
          <li>F\u00fcr Daten-Exports (Excel, JSON) nutzen Sie die Export-Seite</li>
        </ul>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <ReportsContent />
    </DashboardLayout>
  );
}
