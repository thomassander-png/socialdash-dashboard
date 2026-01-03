'use client';

import { useState } from 'react';
import { getCurrentMonth, getAvailableMonths } from '@/lib/utils';

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

export default function ExportsPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(false);
  const months = getAvailableMonths();

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

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">📥 CSV Exports</h1>
      
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 max-w-md">
        <div className="mb-6">
          <label className="block text-gray-400 mb-2">Monat auswählen</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
          >
            {months.map((m) => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => downloadCSV('facebook')}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg disabled:opacity-50"
          >
            📘 Facebook Export ({formatMonth(month)})
          </button>
          <button
            onClick={() => downloadCSV('instagram')}
            disabled={loading}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white px-4 py-3 rounded-lg disabled:opacity-50"
          >
            📸 Instagram Export ({formatMonth(month)})
          </button>
        </div>
      </div>
    </div>
  );
}
