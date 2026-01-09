'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Overview', icon: '📊' },
  { href: '/facebook', label: 'Facebook', icon: '📘' },
  { href: '/instagram', label: 'Instagram', icon: '📸' },
  { href: '/posts', label: 'Alle Posts', icon: '📝' },
  { href: '/exports', label: 'Exports', icon: '📥' },
];

const adminItems = [
  { href: '/admin/customers', label: 'Kunden', icon: '👥' },
  { href: '/admin/accounts', label: 'Accounts', icon: '🔗' },
  { href: '/admin/reports', label: 'Reports', icon: '📄' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 bg-gradient-to-b from-[#111] to-[#0D0D0D] border-r border-[rgba(255,255,255,0.06)] min-h-screen flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#84CC16] to-[#65A30D] flex items-center justify-center">
            <span className="text-black font-bold text-lg">S</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">SocialDash</h1>
            <p className="text-gray-500 text-xs">Reporting Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-gray-600 text-xs uppercase tracking-wider mb-3 px-3 font-medium">Navigation</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-[#84CC16]/20 to-[#84CC16]/5 text-[#84CC16] border border-[#84CC16]/20 shadow-lg shadow-[#84CC16]/5'
                  : 'text-gray-400 hover:bg-[#1A1A1A] hover:text-white'
              }`}
            >
              <span className={`text-xl transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <span className="ml-auto w-2 h-2 rounded-full bg-[#84CC16] animate-pulse"></span>
              )}
            </Link>
          );
        })}
        
        {/* Admin Section */}
        <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.06)]">
          <p className="text-gray-600 text-xs uppercase tracking-wider mb-3 px-3 font-medium">Admin</p>
          {adminItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-[#84CC16]/20 to-[#84CC16]/5 text-[#84CC16] border border-[#84CC16]/20'
                    : 'text-gray-400 hover:bg-[#1A1A1A] hover:text-white'
                }`}
              >
                <span className={`text-xl transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-3 rounded-xl bg-[#1A1A1A]/50">
          <p className="text-xs text-gray-500">Powered by</p>
          <p className="text-sm font-semibold text-[#84CC16]">famefact.</p>
        </div>
      </div>
    </aside>
  );
}
