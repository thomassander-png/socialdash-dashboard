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

  const navItems = [
    { href: '/', label: 'Overview', icon: '📊' },
    { href: '/facebook', label: 'Facebook', icon: '📘' },
    { href: '/instagram', label: 'Instagram', icon: '📸' },
    { href: '/followers', label: 'Follower', icon: '📈' },
    { href: '/posts', label: 'Alle Posts', icon: '📝' },
    { href: '/reports', label: 'Reports', icon: '📄' },
  ];

  const adminItems = [
    { href: '/admin/customers', label: 'Kunden', icon: '👥' },
    { href: '/admin/accounts', label: 'Accounts', icon: '⚙️' },
  ];

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      {/* Sidebar */}
      <div className="w-64 bg-[#141414] border-r border-[#262626] p-6 overflow-y-auto flex flex-col">
        {/* Logo */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#84cc16] rounded-lg flex items-center justify-center">
              <span className="text-black font-bold">S</span>
            </div>
            <div>
              <h1 className="text-white font-bold">SocialDash</h1>
              <p className="text-gray-500 text-xs">Reporting Dashboard</p>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#84cc16]/20 text-[#84cc16]'
                    : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Admin Section */}
        <div className="mt-8 pt-6 border-t border-[#262626]">
          <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Admin
          </p>
          <nav className="space-y-1">
            {adminItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#84cc16]/20 text-[#84cc16]'
                      : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Section */}
        <div className="mt-auto pt-6 border-t border-[#262626]">
          {user && (
            <div className="px-4 py-2 mb-2">
              <p className="text-sm text-white font-medium truncate">{user.email}</p>
              <p className="text-xs text-gray-500">Angemeldet</p>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
          >
            <span>🚪</span>
            <span className="font-medium">Abmelden</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {children}
      </div>
    </div>
  );
}
