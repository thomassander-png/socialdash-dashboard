'use client';

import { useState, useEffect } from 'react';

interface Report {
  report_id: number;
  customer_id: number;
  customer_name: string;
  month: string;
  status: 'pending' | 'generating' | 'generated' | 'completed' | 'failed';
  pptx_url: string | null;
  pdf_url: string | null;
  generated_at: string | null;
}

interface Customer {
  customer_id: string;
  name: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [reportType, setReportType] = useState<'standard' | 'premium'>('premium');

  useEffect(() => {
    fetchReports();
    fetchCustomers();
    // Set default month to previous month
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    setSelectedMonth(`${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`);
  }, []);

  async function fetchReports() {
    try {
      const res = await fetch('/api/admin/reports');
      const data = await res.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCustomers() {
    try {
      const res = await fetch('/api/admin/customers');
      const data = await res.json();
      setCustomers(data.customers || []);
      if (data.customers?.length > 0) {
        setSelectedCustomer(data.customers[0].customer_id);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  }

  async function generateReport() {
    if (!selectedCustomer || !selectedMonth) return;
    
    setGenerating(true);
    try {
      const endpoint = reportType === 'premium' ? '/api/reports/famefact' : '/api/reports/generate';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer,
          month: selectedMonth,
        }),
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${selectedMonth}.pptx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        // Refresh reports list
        fetchReports();
      } else {
        const error = await res.json();
        alert(`Fehler: ${error.error || 'Report konnte nicht generiert werden'}`);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Fehler bei der Report-Generierung');
    } finally {
      setGenerating(false);
    }
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20',
      generating: 'bg-blue-500/20 text-blue-400 border border-blue-500/20',
      generated: 'bg-green-500/20 text-green-400 border border-green-500/20',
      completed: 'bg-green-500/20 text-green-400 border border-green-500/20',
      failed: 'bg-red-500/20 text-red-400 border border-red-500/20',
    };
    const labels: Record<string, string> = {
      pending: 'Ausstehend',
      generating: 'Wird erstellt...',
      generated: 'Fertig',
      completed: 'Fertig',
      failed: 'Fehlgeschlagen',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  }

  function getAvailableMonths() {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }
    return months;
  }

  function formatMonth(month: string) {
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#84CC16] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Reports</h1>
        <p className="text-gray-500 mt-1">Übersicht aller generierten Monatsreports</p>
      </div>

      {/* Generate Report Card */}
      <div className="card p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#84CC16]/20 flex items-center justify-center">
            <span className="text-xl">📊</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Report generieren</h2>
            <p className="text-sm text-gray-500">Erstelle einen neuen Monatsreport als PPTX</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Kunde</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full bg-[#0D0D0D] text-white px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.1)] focus:outline-none focus:ring-2 focus:ring-[#84CC16]/50 focus:border-[#84CC16]"
            >
              {customers.map((customer) => (
                <option key={customer.customer_id} value={customer.customer_id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Monat</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-[#0D0D0D] text-white px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.1)] focus:outline-none focus:ring-2 focus:ring-[#84CC16]/50 focus:border-[#84CC16]"
            >
              {getAvailableMonths().map((month) => (
                <option key={month} value={month}>
                  {formatMonth(month)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Report-Typ</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'standard' | 'premium')}
              className="w-full bg-[#0D0D0D] text-white px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.1)] focus:outline-none focus:ring-2 focus:ring-[#84CC16]/50 focus:border-[#84CC16]"
            >
              <option value="premium">famefact Template (13 Slides)</option>
              <option value="standard">Standard</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={generating || !selectedCustomer || !selectedMonth}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  Generiere...
                </>
              ) : (
                <>
                  <span>📥</span>
                  Report erstellen
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="card p-6 mb-8 border-l-4 border-l-[#84CC16]">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="text-[#84CC16] font-semibold mb-2">Automatische Report-Generierung</h3>
            <p className="text-gray-400 text-sm">
              Reports werden automatisch am 3. jedes Monats um 06:00 UTC generiert.
              Du kannst auch manuell Reports über das Formular oben oder den GitHub Actions Workflow erstellen.
            </p>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#1A1A1A]">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kunde</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Monat</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Erstellt am</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Downloads</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
            {reports.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    <span className="text-4xl block mb-3">📋</span>
                    <p>Noch keine Reports vorhanden.</p>
                    <p className="text-sm mt-1">Erstelle deinen ersten Report über das Formular oben.</p>
                  </div>
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.report_id} className="hover:bg-[#1A1A1A] transition-colors">
                  <td className="px-6 py-4 text-white font-medium">{report.customer_name}</td>
                  <td className="px-6 py-4 text-gray-400">
                    {new Date(report.month).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(report.status)}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {report.generated_at 
                      ? new Date(report.generated_at).toLocaleString('de-DE')
                      : '-'
                    }
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {report.pptx_url && (
                      <a
                        href={report.pptx_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-[#84CC16]/20 text-[#84CC16] rounded-lg hover:bg-[#84CC16]/30 transition-colors"
                      >
                        📊 PPTX
                      </a>
                    )}
                    {report.pdf_url && (
                      <a
                        href={report.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                      >
                        📄 PDF
                      </a>
                    )}
                    {!report.pptx_url && !report.pdf_url && (
                      <span className="text-gray-500 text-sm">-</span>
                    )}
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
