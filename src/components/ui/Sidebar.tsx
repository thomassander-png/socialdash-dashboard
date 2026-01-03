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

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">SocialDash</h1>
        <p className="text-gray-500 text-sm">Reporting Dashboard</p>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === item.href
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
