'use client';

import ExpirationDashboard from '@/components/ExpirationDashboard';
import DashboardLayout from '@/components/DashboardLayout';
import { useState } from 'react';

export default function ExpirationPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Simple Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Expiration Management</h1>
            <p className="text-slate-600 mt-1">Monitor burial expirations and plot reservations</p>
          </div>
          <button
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Dashboard Content */}
        <ExpirationDashboard key={refreshKey} />
      </div>
    </DashboardLayout>
  );
}
