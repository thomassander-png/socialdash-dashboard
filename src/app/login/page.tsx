'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('thomas.sander@famefact.com');
  const [password, setPassword] = useState('SocialDAsh26ff.!!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login fehlgeschlagen');
        setLoading(false);
        return;
      }

      // Login erfolgreich - Redirect zum Dashboard
      router.push('/');
    } catch (err) {
      setError('Ein Fehler ist aufgetreten');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-lg shadow-2xl p-8 border border-slate-700">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block bg-gradient-to-br from-green-400 to-green-600 rounded-lg p-3 mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">SocialDash</h1>
            <p className="text-slate-400">Social Media Reporting Dashboard</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                E-Mail Adresse
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Passwort
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-green-800 disabled:to-green-800 text-white font-semibold rounded-lg transition duration-200"
            >
              {loading ? 'Wird angemeldet...' : 'Anmelden'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-slate-600"></div>
            <span className="px-3 text-slate-400 text-sm">Anmeldedaten</span>
            <div className="flex-1 border-t border-slate-600"></div>
          </div>

          {/* Demo Credentials */}
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <p className="text-xs text-slate-300 font-semibold mb-2">Ihre Anmeldedaten:</p>
            <p className="text-xs text-slate-400 mb-1">
              <span className="text-slate-300">Email:</span> thomas.sander@famefact.com
            </p>
            <p className="text-xs text-slate-400">
              <span className="text-slate-300">Passwort:</span> SocialDAsh26ff.!!
            </p>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-xs text-slate-500 text-center">
              © 2026 SocialDash. Alle Rechte vorbehalten.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
