'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Facebook, 
  Instagram, 
  FileText, 
  Users, 
  Link2, 
  FileBarChart,
  TrendingUp
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/' },
  { icon: Facebook, label: 'Facebook', path: '/facebook' },
  { icon: Instagram, label: 'Instagram', path: '/instagram' },
  { icon: TrendingUp, label: 'Follower', path: '/followers' },
  { icon: FileText, label: 'Alle Posts', path: '/posts' },
];

const adminItems = [
  { icon: Users, label: 'Kunden', path: '/admin/customers' },
  { icon: Link2, label: 'Accounts', path: '/admin/accounts' },
  { icon: FileBarChart, label: 'Reports', path: '/reports' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#141414] border-r border-[#262626] p-4 flex flex-col">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#84cc16] rounded-lg flex items-center justify-center text-black font-bold text-xl">
              S
            </div>
            <div>
              <h1 className="font-bold text-white">SocialDash</h1>
              <p className="text-xs text-gray-500">Reporting Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="flex-1">
          <div className="mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-3">Navigation</p>
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                    isActive
                      ? 'bg-[#84cc16] text-black'
                      : 'text-gray-400 hover:bg-[#1f1f1f] hover:text-white'
                  }`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-3">Admin</p>
            {adminItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                    isActive
                      ? 'bg-[#84cc16] text-black'
                      : 'text-gray-400 hover:bg-[#1f1f1f] hover:text-white'
                  }`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
