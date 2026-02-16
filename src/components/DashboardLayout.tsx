'use client';

import { useState } from 'react';
import { useAuth } from '../app/providers';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { logout, user, isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#84cc16] rounded-xl mb-4 animate-pulse">
            <span className="text-2xl font-bold text-black">S</span>
          </div>
          <p className="text-gray-400">Wird geladen...</p>
        </div>
      </div>
    );
  }

  // Don't render dashboard if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Grouped navigation for better UX
  const mainNavItems = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/clients', label: 'Kunden', icon: '👤' },
  ];

  const platformNavItems = [
    { href: '/facebook', label: 'Facebook', icon: '📘' },
    { href: '/instagram', label: 'Instagram', icon: '📸' },
    { href: '/ads', label: 'Paid Ads', icon: '📣' },
  ];

  const analyticsNavItems = [
    { href: '/followers', label: 'Follower', icon: '📈' },
    { href: '/posts', label: 'Alle Posts', icon: '📝' },
  ];

  const exportNavItems = [
    { href: '/reports', label: 'Reports', icon: '📄' },
    { href: '/exports', label: 'Daten Export', icon: '📥' },
  ];

  const adminItems = [
    { href: '/admin/customers', label: 'Kunden', icon: '👥' },
    { href: '/admin/accounts', label: 'Accounts', icon: '⚙️' },
  ];

  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  const renderNavGroup = (label: string, items: typeof mainNavItems) => (
    <div className="mb-4">
      <p className="px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}
      </p>
      <nav className="space-y-0.5">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${
                isActive
                  ? 'bg-[#84cc16]/20 text-[#84cc16]'
                  : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#141414] border-b border-[#262626] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#84cc16] rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-sm">S</span>
          </div>
          <h1 className="text-white font-bold text-sm">SocialDash</h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-40
        w-56 bg-[#141414] border-r border-[#262626] p-4 overflow-y-auto flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:transform-none
        pt-16 lg:pt-4
      `}>
        {/* Logo */}
        <div className="mb-5 hidden lg:block">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 bg-[#84cc16] rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">S</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-sm">SocialDash</h1>
              <p className="text-gray-500 text-[10px]">Reporting Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation Groups */}
        {renderNavGroup('Übersicht', mainNavItems)}
        {renderNavGroup('Plattformen', platformNavItems)}
        {renderNavGroup('Analyse', analyticsNavItems)}
        {renderNavGroup('Export', exportNavItems)}

        {/* Admin Section */}
        <div className="mt-2 pt-3 border-t border-[#262626]">
          {renderNavGroup('Admin', adminItems)}
        </div>

        {/* User Section */}
        <div className="mt-auto pt-4 border-t border-[#262626]">
          {user && (
            <div className="px-3 py-1.5 mb-1">
              <p className="text-xs text-white font-medium truncate">{user.email}</p>
              <p className="text-[10px] text-gray-500">Angemeldet</p>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 text-gray-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors text-sm"
          >
            <span>🚪</span>
            <span className="font-medium">Abmelden</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 lg:p-6 pt-16 lg:pt-6">
        {children}
      </div>
    </div>
  );
}
