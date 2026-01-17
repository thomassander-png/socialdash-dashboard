'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    document.cookie = 'sb-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    router.push('/auth/signin');
  };

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 p-6 overflow-y-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <div>
              <h1 className="text-white font-bold">SocialDash</h1>
              <p className="text-slate-400 text-xs">Reporting Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="space-y-2">
          <a href="/" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg">
            📊 Overview
          </a>
          <a href="/facebook" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg">
            📘 Facebook
          </a>
          <a href="/instagram" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg">
            📸 Instagram
          </a>
          <a href="/followers" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg">
            📈 Follower
          </a>
          <a href="/posts" className="block px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg">
            📝 Alle Posts
          </a>
        </nav>

        <div className="mt-8 pt-8 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-slate-300 hover:bg-red-600/20 rounded-lg text-left"
          >
            🚪 Abmelden
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
