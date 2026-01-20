'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';

function ReportsContent() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isGenerating, setIsGenerating] = useState(false);
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

  const handleGenerateReport = async (reportType: string) => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/reports/${reportType}?month=${selectedMonth}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_Report_${selectedMonth}.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`Report erfolgreich generiert und heruntergeladen!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-4">
        <span className="text-2xl">📄</span> Reports
      </h1>
      
      <p className="text-gray-400 mb-6">
        Generiere kundenspezifische PowerPoint-Reports im famefact-Design.
      </p>

      {/* Month Selector */}
      <div className="bg-[#1e1e2e] rounded-lg p-4 mb-6">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Berichtsmonat auswählen
        </label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-[#2d2d44] text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-green-500 focus:outline-none"
        >
          {monthOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

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

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* ANDskincare Report */}
        <div className="bg-gradient-to-br from-[#A8D65C]/20 to-[#9B59B6]/20 rounded-xl p-6 border border-[#A8D65C]/30 hover:border-[#A8D65C]/60 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex gap-1">
              {['A', 'N', 'D'].map((letter) => (
                <div
                  key={letter}
                  className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white font-bold text-sm"
                >
                  {letter}
                </div>
              ))}
            </div>
            <span className="text-gray-400 text-sm">SKINCARE</span>
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">ANDskincare Report</h3>
          <p className="text-gray-400 text-sm mb-4">
            Facebook & Instagram Performance Report im famefact-Design mit KPI-Tabellen, 
            Balkendiagrammen und Top Postings.
          </p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2 py-1 bg-[#A8D65C]/20 text-[#A8D65C] rounded text-xs">Facebook</span>
            <span className="px-2 py-1 bg-[#9B59B6]/20 text-[#9B59B6] rounded text-xs">Instagram</span>
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">PPTX</span>
          </div>
          
          <button
            onClick={() => handleGenerateReport('andskincare')}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-[#A8D65C] to-[#9B59B6] text-white font-semibold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generiere...
              </span>
            ) : (
              '📥 Report generieren'
            )}
          </button>
        </div>

        {/* Placeholder for more reports */}
        <div className="bg-[#1e1e2e] rounded-xl p-6 border border-gray-700 border-dashed opacity-50">
          <div className="text-center">
            <span className="text-4xl mb-4 block">➕</span>
            <h3 className="text-lg font-semibold text-gray-400 mb-2">Weitere Kunden</h3>
            <p className="text-gray-500 text-sm">
              Weitere kundenspezifische Reports werden hier hinzugefügt.
            </p>
          </div>
        </div>

      </div>

      {/* Info Box */}
      <div className="bg-[#1e1e2e] rounded-lg p-4 mt-8">
        <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
          <span>ℹ️</span> Hinweise zu den Reports
        </h4>
        <ul className="text-gray-400 text-sm space-y-1">
          <li>• Reports enthalten automatisch die letzten 3 Monate für KPI-Vergleiche</li>
          <li>• Screenshot-Platzhalter müssen manuell mit Facebook Insights Screenshots befüllt werden</li>
          <li>• <span className="text-yellow-400">Shares</span>: Nicht für alle Posts verfügbar (API-Limitation)</li>
          <li>• <span className="text-yellow-400">Saves</span>: Nicht über die Graph API abrufbar</li>
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
