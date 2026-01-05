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
    <aside className="w-64 bg-[#0a0a0a] border-r border-[#1a1a1a] min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-[#c8ff00]">SocialDash</h1>
        <p className="text-gray-500 text-sm">Reporting Dashboard</p>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === item.href
                ? 'bg-[#c8ff00]/20 text-[#c8ff00] border border-[#c8ff00]/30'
                : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      
      {/* Admin Section */}
      <div className="mt-8 pt-4 border-t border-[#1a1a1a]">
        <p className="text-gray-600 text-xs uppercase tracking-wider mb-3 px-4">Admin</p>
        <nav className="space-y-2">
          {adminItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === item.href
                  ? 'bg-[#c8ff00]/20 text-[#c8ff00] border border-[#c8ff00]/30'
                  : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
