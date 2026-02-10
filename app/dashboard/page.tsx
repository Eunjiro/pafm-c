'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface DashboardStats {
  totalCemeteries: number;
  totalPlots: number;
  totalCapacity: number;
  availableCapacity: number;
  totalDeceased: number;
  expiringBurials: number;
  reservedPlots: number;
  recentBurials: number;
  pendingPermits: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCemeteries: 0,
    totalPlots: 0,
    totalCapacity: 0,
    availableCapacity: 0,
    totalDeceased: 0,
    expiringBurials: 0,
    reservedPlots: 0,
    recentBurials: 0,
    pendingPermits: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch cemeteries count
        const cemeteriesRes = await fetch('/api/cemeteries');
        const cemeteriesData = await cemeteriesRes.json();
        const totalCemeteries = cemeteriesData.cemeteries?.length || 0;

        // Fetch all plots and burials to calculate capacity
        let totalPlots = 0;
        let totalCapacity = 0;
        let occupiedCapacity = 0;
        let allBurialsData: any[] = [];

        if (totalCemeteries > 0) {
          // Fetch plots for each cemetery
          const plotPromises = cemeteriesData.cemeteries.map((cemetery: any) =>
            fetch(`/api/plots?cemetery_id=${cemetery.id}`).then(r => r.json())
          );
          
          const allPlotsData = await Promise.all(plotPromises);
          
          // Fetch burials for each cemetery to count occupied layers
          const burialPromises = cemeteriesData.cemeteries.map((cemetery: any) =>
            fetch(`/api/burials?cemetery_id=${cemetery.id}`).then(r => r.json())
          );
          
          allBurialsData = await Promise.all(burialPromises);
          
          allPlotsData.forEach((data) => {
            const plots = data.plots || [];
            totalPlots += plots.length;
            
            // Calculate total capacity (sum of all layers)
            plots.forEach((plot: any) => {
              totalCapacity += plot.layers || 1;
            });
          });
          
          // Count occupied layers from burials
          allBurialsData.forEach((data) => {
            const burials = data.burials || [];
            occupiedCapacity += burials.length;
          });
        }

        const availableCapacity = totalCapacity - occupiedCapacity;

        // Fetch deceased count
        const deceasedRes = await fetch('/api/deceased');
        const deceasedData = await deceasedRes.json();
        const totalDeceased = deceasedData.deceased?.length || 0;

        // Fetch expiring burials
        const expiringRes = await fetch('/api/burials/renew?expiring=true');
        const expiringData = await expiringRes.json();
        const expiringBurials = expiringData.burials?.length || 0;

        // Fetch reserved plots
        const reservedRes = await fetch('/api/plots/reserve?check_expired=true');
        const reservedData = await reservedRes.json();
        const reservedPlots = reservedData.plots?.length || 0;

        // Calculate recent burials (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        let recentBurials = 0;
        allBurialsData.forEach((data: any) => {
          const burials = data.burials || [];
          recentBurials += burials.filter((b: any) => 
            new Date(b.burial_date) >= thirtyDaysAgo
          ).length;
        });

        // Fetch pending permits
        let pendingPermits = 0;
        try {
          const permitsRes = await fetch('/api/permits?status=pending');
          const permitsData = await permitsRes.json();
          pendingPermits = permitsData.permits?.length || 0;
        } catch (error) {
          console.error('Error fetching pending permits:', error);
        }

        setStats({
          totalCemeteries,
          totalPlots,
          totalCapacity,
          availableCapacity,
          totalDeceased,
          expiringBurials,
          reservedPlots,
          recentBurials,
          pendingPermits,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Cemetery Management Dashboard</h1>
          <p className="text-slate-600 mt-2">Overview of all cemeteries and burial records</p>
        </div>

        {/* Dashboard Stats - Primary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Cemeteries</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {loading ? '...' : stats.totalCemeteries}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Grave Plots</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {loading ? '...' : stats.totalPlots}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Capacity</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {loading ? '...' : stats.totalCapacity}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Available Capacity</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {loading ? '...' : stats.availableCapacity}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-green-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Deceased Records</p>
                <p className="text-2xl font-bold text-slate-900">{loading ? '...' : stats.totalDeceased}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Expiring Soon</p>
                <p className="text-2xl font-bold text-amber-700">{loading ? '...' : stats.expiringBurials}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-green-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Reserved Plots</p>
                <p className="text-2xl font-bold text-green-700">{loading ? '...' : stats.reservedPlots}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-green-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Recent Burials (30d)</p>
                <p className="text-2xl font-bold text-blue-700">{loading ? '...' : stats.recentBurials}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Pending Permits</p>
                <p className="text-2xl font-bold text-purple-700">{loading ? '...' : stats.pendingPermits}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="/dashboard/cemeteries-manage"
              className="block bg-white rounded-xl shadow-sm border border-green-100 hover:shadow-lg hover:border-green-300 transition-all p-6 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-green-700 transition-colors">Manage Cemeteries</h3>
                  <p className="text-sm text-slate-600 mt-1">Add, edit, and view cemetery information and locations</p>
                </div>
              </div>
            </a>

            <a
              href="/dashboard/expiration"
              className="block bg-white rounded-xl shadow-sm border border-amber-100 hover:shadow-lg hover:border-amber-300 transition-all p-6 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">Expiration & Renewals</h3>
                  <p className="text-sm text-slate-600 mt-1">Monitor and manage burial expirations and renewals</p>
                </div>
              </div>
            </a>

            <a
              href="/dashboard/logs"
              className="block bg-white rounded-xl shadow-sm border border-blue-100 hover:shadow-lg hover:border-blue-300 transition-all p-6 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">Activity Logs</h3>
                  <p className="text-sm text-slate-600 mt-1">View system activity and track changes</p>
                </div>
              </div>
            </a>

            <a
              href="/dashboard/permits"
              className="block bg-white rounded-xl shadow-sm border border-purple-100 hover:shadow-lg hover:border-purple-300 transition-all p-6 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-purple-700 transition-colors">Pending Permits</h3>
                  <p className="text-sm text-slate-600 mt-1">Review and assign approved burial permits</p>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
