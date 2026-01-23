'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';

interface Customer {
  customer_id: number;
  name: string;
  slug: string;
}

function ExportsContent() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
          setCustomers(data.customers || []);
        }
      } catch (err) {
        console.error('Failed to fetch customers:', err);
      }
    }
    fetchCustomers();
  }, []);

  const handleExcelExport = async () => {
    setIsExporting(true);
    setExportType('excel');
    setError(null);
    setSuccess(null);

    try {
      const params = new URLSearchParams({
        month: selectedMonth,
        customer: selectedCustomer,
        platform: selectedPlatform,
      });
      
      const response = await fetch(`/api/export/excel-download?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export fehlgeschlagen');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const customerSlug = selectedCustomer === 'all' ? 'alle' : selectedCustomer.replace(/\s+/g, '-').toLowerCase();
      a.download = `Social_Media_Report_${customerSlug}_${selectedMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('Excel-Export erfolgreich heruntergeladen!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleJsonExport = async () => {
    setIsExporting(true);
    setExportType('json');
    setError(null);
    setSuccess(null);

    try {
      const params = new URLSearchParams({
        month: selectedMonth,
        customer: selectedCustomer,
      });
      
      const response = await fetch(`/api/export/excel?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export fehlgeschlagen');
      }

      const data = await response.json();
      
      // Download as JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const customerSlug = selectedCustomer === 'all' ? 'alle' : selectedCustomer.replace(/\s+/g, '-').toLowerCase();
      a.download = `Social_Media_Data_${customerSlug}_${selectedMonth}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('JSON-Export erfolgreich heruntergeladen!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-4">
        <span className="text-2xl">📊</span> Daten Export
      </h1>
      
      <p className="text-gray-400 mb-6">
        Exportiere Social Media Daten als Excel oder JSON für weitere Analysen.
      </p>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Filter Section */}
      <div className="bg-[#1e1e2e] rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Export-Optionen</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Month Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Monat
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-[#2d2d44] text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-green-500 focus:outline-none"
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Kunde
            </label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full bg-[#2d2d44] text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-green-500 focus:outline-none"
            >
              <option value="all">Alle Kunden</option>
              {customers.map((customer) => (
                <option key={customer.customer_id} value={customer.slug || customer.name.toLowerCase().replace(/\s+/g, '-')}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          {/* Platform Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Plattform
            </label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="w-full bg-[#2d2d44] text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-green-500 focus:outline-none"
            >
              <option value="all">Alle Plattformen</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>
        </div>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Excel Export */}
        <div className="bg-gradient-to-br from-[#217346]/20 to-[#185C37]/20 rounded-xl p-6 border border-[#217346]/30 hover:border-[#217346]/60 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-[#217346] flex items-center justify-center">
              <span className="text-white text-2xl">📗</span>
            </div>
            <div>
              <span className="text-[#217346] font-bold text-lg">Excel</span>
              <span className="text-gray-400 text-sm block">.xlsx</span>
            </div>
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">Excel Export</h3>
          <p className="text-gray-400 text-sm mb-4">
            Vollständiger Export aller KPIs mit separaten Sheets für Facebook und Instagram. 
            Inkl. Formatierung und Zusammenfassung.
          </p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2 py-1 bg-[#217346]/20 text-[#217346] rounded text-xs">Formatiert</span>
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">Multi-Sheet</span>
            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">Zusammenfassung</span>
          </div>
          
          <button
            onClick={handleExcelExport}
            disabled={isExporting}
            className="w-full bg-gradient-to-r from-[#217346] to-[#185C37] text-white font-semibold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportType === 'excel' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Exportiere...
              </span>
            ) : (
              '📥 Excel herunterladen'
            )}
          </button>
        </div>

        {/* JSON Export */}
        <div className="bg-gradient-to-br from-[#F7DF1E]/20 to-[#323330]/20 rounded-xl p-6 border border-[#F7DF1E]/30 hover:border-[#F7DF1E]/60 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-[#F7DF1E] flex items-center justify-center">
              <span className="text-black text-2xl font-bold">{'{}'}</span>
            </div>
            <div>
              <span className="text-[#F7DF1E] font-bold text-lg">JSON</span>
              <span className="text-gray-400 text-sm block">.json</span>
            </div>
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">JSON Export</h3>
          <p className="text-gray-400 text-sm mb-4">
            Rohdaten im JSON-Format für Entwickler und API-Integration. 
            Ideal für weitere Verarbeitung.
          </p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2 py-1 bg-[#F7DF1E]/20 text-[#F7DF1E] rounded text-xs">Rohdaten</span>
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">API-ready</span>
          </div>
          
          <button
            onClick={handleJsonExport}
            disabled={isExporting}
            className="w-full bg-gradient-to-r from-[#F7DF1E] to-[#323330] text-white font-semibold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportType === 'json' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Exportiere...
              </span>
            ) : (
              '📥 JSON herunterladen'
            )}
          </button>
        </div>

        {/* CSV Export Placeholder */}
        <div className="bg-[#1e1e2e] rounded-xl p-6 border border-gray-700 border-dashed opacity-50">
          <div className="text-center">
            <span className="text-4xl mb-4 block">📄</span>
            <h3 className="text-lg font-semibold text-gray-400 mb-2">CSV Export</h3>
            <p className="text-gray-500 text-sm">
              Demnächst verfügbar
            </p>
          </div>
        </div>

      </div>

      {/* Info Box */}
      <div className="bg-[#1e1e2e] rounded-lg p-4 mt-8">
        <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
          <span>ℹ️</span> Hinweise zum Export
        </h4>
        <ul className="text-gray-400 text-sm space-y-1">
          <li>• <span className="text-[#217346]">Excel</span>: Enthält formatierte Tabellen mit Zusammenfassung und Engagement-Raten</li>
          <li>• <span className="text-[#F7DF1E]">JSON</span>: Rohdaten für technische Weiterverarbeitung oder API-Integration</li>
          <li>• Alle Exports enthalten die neuesten verfügbaren Metriken für jeden Post</li>
          <li>• <span className="text-yellow-400">Tipp</span>: Für Quartals-Reports nutzen Sie die Reports-Seite</li>
        </ul>
      </div>
    </div>
  );
}

export default function ExportsPage() {
  return (
    <DashboardLayout>
      <ExportsContent />
    </DashboardLayout>
  );
}
