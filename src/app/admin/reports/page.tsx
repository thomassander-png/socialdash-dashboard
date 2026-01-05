'use client';

import { useState, useEffect } from 'react';

interface Report {
  report_id: number;
  customer_id: number;
  customer_name: string;
  month: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  pptx_url: string | null;
  pdf_url: string | null;
  generated_at: string | null;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
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

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      generating: 'bg-blue-500/20 text-blue-400',
      completed: 'bg-green-500/20 text-green-400',
      failed: 'bg-red-500/20 text-red-400',
    };
    const labels: Record<string, string> = {
      pending: 'Ausstehend',
      generating: 'Wird erstellt...',
      completed: 'Fertig',
      failed: 'Fehlgeschlagen',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Reports</h1>
        <p className="text-gray-400 mt-1">Übersicht aller generierten Monatsreports</p>
      </div>

      {/* Info Box */}
      <div className="bg-[#111] border border-[#c8ff00]/30 rounded-xl p-6 mb-8">
        <h2 className="text-[#c8ff00] font-semibold mb-2">📊 Report-Generierung</h2>
        <p className="text-gray-400 text-sm">
          Reports werden automatisch am 3. jedes Monats um 06:00 UTC generiert.
          Du kannst auch manuell Reports über den GitHub Actions Workflow "generate_reports" erstellen.
        </p>
      </div>

      {/* Reports Table */}
      <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0a0a0a]">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Kunde</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Monat</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Erstellt am</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Downloads</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {reports.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Noch keine Reports vorhanden. Reports werden automatisch am 3. des Monats generiert.
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.report_id} className="hover:bg-[#0a0a0a]">
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
                        className="px-3 py-1 text-sm bg-[#c8ff00]/20 text-[#c8ff00] rounded hover:bg-[#c8ff00]/30 transition-colors"
                      >
                        📊 PPTX
                      </a>
                    )}
                    {report.pdf_url && (
                      <a
                        href={report.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
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
