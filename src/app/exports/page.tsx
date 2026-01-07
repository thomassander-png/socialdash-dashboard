'use client';

import { useState, useEffect } from 'react';
import { getCurrentMonth, getAvailableMonths } from '@/lib/utils';

interface Customer {
  customer_id: string;
  name: string;
  is_active: boolean;
  fb_account_count?: number;
  ig_account_count?: number;
}

interface FacebookPost {
  post_id: string;
  created_time: string;
  type: string;
  reactions_total: number;
  comments_total: number;
  shares_total?: number;
  reach?: number;
  impressions?: number;
  message?: string;
}

interface InstagramPost {
  media_id: string;
  timestamp: string;
  media_type: string;
  likes: number;
  comments: number;
  saves?: number;
  reach?: number;
  plays?: number;
  caption?: string;
}

interface ReportStats {
  facebook: {
    posts: number;
    reach: number;
    interactions: number;
  } | null;
  instagram: {
    posts: number;
    reach: number;
    interactions: number;
  } | null;
}

export default function ExportsPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [lastReportStats, setLastReportStats] = useState<ReportStats | null>(null);
  const months = getAvailableMonths();

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    try {
      const res = await fetch('/api/admin/customers');
      const data = await res.json();
      const activeCustomers = (data.customers || []).filter((c: Customer) => c.is_active);
      setCustomers(activeCustomers);
      if (activeCustomers.length > 0 && !selectedCustomer) {
        setSelectedCustomer(activeCustomers[0].customer_id);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  }

  const formatMonth = (m: string) => {
    const [year, mon] = m.split('-');
    const date = new Date(parseInt(year), parseInt(mon) - 1);
    return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  };

  const downloadCSV = async (type: 'facebook' | 'instagram') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${type}/posts?month=${month}&limit=1000`);
      const data = await res.json();
      
      let csv = '';
      if (type === 'facebook') {
        csv = 'Post ID,Datum,Typ,Reactions,Comments,Shares,Reach,Impressions,Message\n';
        (data as FacebookPost[]).forEach((p) => {
          csv += `"${p.post_id}","${p.created_time}","${p.type}",${p.reactions_total},${p.comments_total},${p.shares_total || ''},${p.reach || ''},${p.impressions || ''},"${(p.message || '').replace(/"/g, '""')}"\n`;
        });
      } else {
        csv = 'Media ID,Datum,Typ,Likes,Comments,Saves,Reach,Plays,Caption\n';
        (data as InstagramPost[]).forEach((p) => {
          csv += `"${p.media_id}","${p.timestamp}","${p.media_type}",${p.likes},${p.comments},${p.saves || ''},${p.reach || ''},${p.plays || ''},"${(p.caption || '').replace(/"/g, '""')}"\n`;
        });
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${month}.csv`;
      a.click();
    } catch {
      alert('Export fehlgeschlagen');
    }
    setLoading(false);
  };

  const generateReport = async () => {
    if (!selectedCustomer) {
      alert('Bitte wählen Sie einen Kunden aus');
      return;
    }

    setGenerating(true);
    setLastReportStats(null);
    
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer,
          month: month,
        }),
      });

      const data = await res.json();

      if (data.success && data.data) {
        // Convert base64 to blob and download
        const binaryString = atob(data.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: data.mimeType });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        a.click();
        URL.revokeObjectURL(url);

        // Show stats
        if (data.stats) {
          setLastReportStats(data.stats);
        }
      } else {
        alert('Report-Generierung fehlgeschlagen: ' + (data.error || 'Unbekannter Fehler'));
      }
    } catch (error) {
      console.error('Report generation failed:', error);
      alert('Report-Generierung fehlgeschlagen');
    }
    
    setGenerating(false);
  };

  const selectedCustomerName = customers.find(c => c.customer_id === selectedCustomer)?.name || '';

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">📥 Exports & Reports</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* PPTX Report Generator */}
        <div className="bg-[#111] rounded-xl p-6 border border-[#c8ff00]/30">
          <h2 className="text-xl font-bold text-[#c8ff00] mb-4">📊 PPTX Report Generator</h2>
          <p className="text-gray-400 text-sm mb-6">
            Generiert einen vollständigen Monatsreport für einen Kunden mit Facebook und Instagram KPIs, Top Posts und Bildern.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 mb-2">Kunde auswählen</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-[#c8ff00] focus:outline-none"
              >
                {customers.length === 0 ? (
                  <option value="">Keine Kunden verfügbar</option>
                ) : (
                  customers.map((c) => (
                    <option key={c.customer_id} value={c.customer_id}>
                      {c.name} ({c.fb_account_count || 0} FB, {c.ig_account_count || 0} IG)
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 mb-2">Monat auswählen</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-[#c8ff00] focus:outline-none"
              >
                {months.map((m) => (
                  <option key={m} value={m}>{formatMonth(m)}</option>
                ))}
              </select>
            </div>

            <button
              onClick={generateReport}
              disabled={generating || !selectedCustomer}
              className="w-full bg-[#c8ff00] hover:bg-[#b8ef00] text-black font-semibold px-4 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Wird generiert...
                </span>
              ) : (
                `📊 Report für ${selectedCustomerName || 'Kunde'} generieren`
              )}
            </button>

            {lastReportStats && (
              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <h3 className="text-green-400 font-semibold mb-2">✅ Report erfolgreich generiert!</h3>
                <div className="text-sm text-gray-400 space-y-1">
                  {lastReportStats.facebook && (
                    <p>📘 Facebook: {lastReportStats.facebook.posts} Posts, {lastReportStats.facebook.reach.toLocaleString('de-DE')} Reichweite, {lastReportStats.facebook.interactions.toLocaleString('de-DE')} Interaktionen</p>
                  )}
                  {lastReportStats.instagram && (
                    <p>📸 Instagram: {lastReportStats.instagram.posts} Posts, {lastReportStats.instagram.reach.toLocaleString('de-DE')} Reichweite, {lastReportStats.instagram.interactions.toLocaleString('de-DE')} Interaktionen</p>
                  )}
                  {!lastReportStats.facebook && !lastReportStats.instagram && (
                    <p>⚠️ Keine Daten für diesen Monat gefunden</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
            <h3 className="text-white font-semibold mb-2">Der Report enthält:</h3>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• Cover-Slide mit Kundenname und Monat</li>
              <li>• Facebook KPI-Tabelle (Reichweite, Interaktionen, etc.)</li>
              <li>• Top 6 Facebook Posts mit Bildern</li>
              <li>• Top 6 Facebook Videos nach Views</li>
              <li>• Instagram KPI-Tabelle (inkl. Saves)</li>
              <li>• Top 6 Instagram Posts mit Bildern</li>
              <li>• Top 6 Instagram Reels nach Plays</li>
              <li>• Automatisches Fazit</li>
            </ul>
          </div>
        </div>

        {/* CSV Exports */}
        <div className="bg-[#111] rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">📥 CSV Exports</h2>
          <p className="text-gray-400 text-sm mb-6">
            Exportiert alle Posts eines Monats als CSV-Datei für Excel oder weitere Analysen.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 mb-2">Monat auswählen</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
              >
                {months.map((m) => (
                  <option key={m} value={m}>{formatMonth(m)}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => downloadCSV('facebook')}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg disabled:opacity-50 transition-colors"
            >
              📘 Facebook Export ({formatMonth(month)})
            </button>
            
            <button
              onClick={() => downloadCSV('instagram')}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-3 rounded-lg disabled:opacity-50 transition-colors"
            >
              📸 Instagram Export ({formatMonth(month)})
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
            <h3 className="text-white font-semibold mb-2">CSV enthält:</h3>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• Post ID, Datum, Typ</li>
              <li>• Reactions/Likes, Comments</li>
              <li>• Shares (FB) / Saves (IG)</li>
              <li>• Reach, Impressions</li>
              <li>• Video Views / Plays</li>
              <li>• Post-Text / Caption</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-[#111] border border-yellow-500/30 rounded-xl p-6">
        <h2 className="text-yellow-400 font-semibold mb-2">⚠️ Facebook API Einschränkungen</h2>
        <ul className="text-gray-400 text-sm space-y-1">
          <li><strong>Shares:</strong> Nicht für alle Posts verfügbar, daher separat ausgewiesen und nicht in Interaktionen enthalten.</li>
          <li><strong>Saves:</strong> Nicht über die Graph API abrufbar (nur Instagram).</li>
          <li><strong>Organisch vs. Paid:</strong> Nur über Ads API verfügbar (nicht implementiert).</li>
        </ul>
      </div>
    </div>
  );
}
