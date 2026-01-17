'use client';

import { DashboardLayout } from '@/components/DashboardLayout';

function AccountsContent() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-4">
        <span className="text-2xl">⚙️</span> Accounts
      </h1>
      <p className="text-gray-500">Diese Seite wird noch entwickelt.</p>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <DashboardLayout>
      <AccountsContent />
    </DashboardLayout>
  );
}
