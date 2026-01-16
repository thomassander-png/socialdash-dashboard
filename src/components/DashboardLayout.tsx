'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { emoji: '📊', label: 'Overview', path: '/' },
  { emoji: '📘', label: 'Facebook', path: '/facebook' },
  { emoji: '📸', label: 'Instagram', path: '/instagram' },
  { emoji: '📈', label: 'Follower', path: '/followers' },
  { emoji: '📝', label: 'Alle Posts', path: '/posts' },
];

const adminItems = [
  { emoji: '👥', label: 'Kunden', path: '/admin/customers' },
  { emoji: '🔗', label: 'Accounts', path: '/admin/accounts' },
  { emoji: '📄', label: 'Reports', path: '/reports' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#141414] border-r border-[#262626] p-4 flex flex-col">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#84cc16] to-[#65a30d] rounded-lg flex items-center justify-center text-black font-bold text-xl shadow-lg shadow-[#84cc16]/20">
              S
            </div>
            <div>
              <h1 className="font-bold text-white text-lg">SocialDash</h1>
              <p className="text-xs text-gray-500">Reporting Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="flex-1">
          <div className="mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 px-3 font-medium">Navigation</p>
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#84cc16] to-[#65a30d] text-black font-medium shadow-lg shadow-[#84cc16]/20'
                      : 'text-gray-400 hover:bg-[#1f1f1f] hover:text-white'
                  }`}
                >
                  <span className="text-lg">{item.emoji}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 px-3 font-medium">Admin</p>
            {adminItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#84cc16] to-[#65a30d] text-black font-medium shadow-lg shadow-[#84cc16]/20'
                      : 'text-gray-400 hover:bg-[#1f1f1f] hover:text-white'
                  }`}
                >
                  <span className="text-lg">{item.emoji}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="pt-4 border-t border-[#262626]">
          <p className="text-gray-600 text-xs text-center">
            Powered by{' '}
            <a 
              href="https://famefact.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[#84cc16] hover:underline"
            >
              famefact
            </a>
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
