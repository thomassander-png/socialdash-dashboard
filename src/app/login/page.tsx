'use client';

import { useState } from 'react';
import { useAuth } from '../providers';

export default function LoginPage() {
  const [email, setEmail] = useState('thomas.sander@famefact.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate network delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    const success = login(email, password);
    
    if (!success) {
      setError('Ungültige E-Mail oder Passwort');
      setLoading(false);
    }
    // If success, the AuthProvider will redirect to /
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#141414] rounded-xl shadow-2xl p-8 border border-[#262626]">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#84cc16] rounded-xl mb-4">
              <span className="text-3xl font-bold text-black">S</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">SocialDash</h1>
            <p className="text-gray-400">Reporting Dashboard</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                E-Mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#262626] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#84cc16] focus:ring-1 focus:ring-[#84cc16] transition-colors"
                placeholder="E-Mail eingeben"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Passwort
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#262626] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#84cc16] focus:ring-1 focus:ring-[#84cc16] transition-colors"
                placeholder="Passwort eingeben"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#84cc16] hover:bg-[#65a30d] disabled:bg-[#84cc16]/50 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Wird angemeldet...
                </>
              ) : (
                'Anmelden'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-[#262626]">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <span className="text-[#84cc16]">●</span>
              <span>famefact Social Media Reporting</span>
            </div>
          </div>
        </div>

        {/* Version Info */}
        <p className="text-center text-xs text-gray-600 mt-4">
          Version 2.0 • Powered by Vercel
        </p>
      </div>
    </div>
  );
}
