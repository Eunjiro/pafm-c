/**
 * Expiration Dashboard Component
 * Monitors expiring burials, renewals, and plot reservations
 */

'use client';

import { useState, useEffect } from 'react';

interface Burial {
  id: number;
  plot_id: number;
  deceased_id: number;
  first_name: string;
  last_name: string;
  burial_date: string;
  expiration_date: string;
  is_expired: boolean;
  days_until_expiration: number;
}

interface ReservedPlot {
  id: number;
  plot_number: string;
  reserved_by: string;
  reserved_date: string;
  reservation_expiry: string;
  days_until_expiry: number;
}

export default function ExpirationDashboard() {
  const [expiringBurials, setExpiringBurials] = useState<Burial[]>([]);
  const [expiredBurials, setExpiredBurials] = useState<Burial[]>([]);
  const [reservedPlots, setReservedPlots] = useState<ReservedPlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'expiring' | 'expired' | 'reserved'>('expiring');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch expiring burials (within 90 days)
      const expiringRes = await fetch('/api/burials/renew?expiring=true', {
        credentials: 'include'
      });
      const expiringData = await expiringRes.json();
      setExpiringBurials(expiringData.burials || []);

      // Fetch expired burials
      const expiredRes = await fetch('/api/burials/renew', {
        credentials: 'include'
      });
      const expiredData = await expiredRes.json();
      setExpiredBurials(expiredData.burials || []);

      // Fetch reserved plots and clean up expired ones
      const reservedRes = await fetch('/api/plots/reserve?check_expired=true', {
        credentials: 'include'
      });
      const reservedData = await reservedRes.json();
      setReservedPlots(reservedData.plots || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelReservation = async (plotId: number) => {
    if (!confirm('Cancel this reservation?')) return;

    try {
      const response = await fetch(`/api/plots/reserve?plot_id=${plotId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        alert('Reservation cancelled successfully!');
        fetchData();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      alert('Failed to cancel reservation');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-green-100 overflow-hidden">
        <div className="flex border-b border-green-200">
          <button
            onClick={() => setActiveTab('expiring')}
            className={`flex-1 px-6 py-4 font-medium transition-all ${
              activeTab === 'expiring'
                ? 'bg-amber-50 text-amber-900 border-b-2 border-amber-500'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Expiring Soon</span>
              <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-amber-200 text-amber-900 rounded-full">
                {expiringBurials.length}
              </span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('expired')}
            className={`flex-1 px-6 py-4 font-medium transition-all ${
              activeTab === 'expired'
                ? 'bg-red-50 text-red-900 border-b-2 border-red-500'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Expired</span>
              <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-200 text-red-900 rounded-full">
                {expiredBurials.length}
              </span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('reserved')}
            className={`flex-1 px-6 py-4 font-medium transition-all ${
              activeTab === 'reserved'
                ? 'bg-green-50 text-green-900 border-b-2 border-green-500'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Reserved Plots</span>
              <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-green-200 text-green-900 rounded-full">
                {reservedPlots.length}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6">
        {/* Expiring Soon Tab */}
        {activeTab === 'expiring' && (
          <div>
            <h2 className="text-xl font-semibold text-amber-900 flex items-center gap-2 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Expiring Soon (Next 90 Days)
            </h2>
            
            {expiringBurials.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-slate-500 font-medium">No burials expiring soon</p>
                <p className="text-sm text-slate-400 mt-1">All burials are up to date</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expiringBurials.map((burial) => (
                  <div 
                    key={burial.id} 
                    className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-500 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 text-lg">
                          {burial.first_name} {burial.last_name}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            Plot #{burial.plot_id}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Buried: {burial.burial_date}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="inline-block px-3 py-1 bg-amber-200 text-amber-900 rounded-full text-sm font-bold">
                          {Math.floor(burial.days_until_expiration)} days
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Expires: {burial.expiration_date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Expired Tab */}
        {activeTab === 'expired' && (
          <div>
            <h2 className="text-xl font-semibold text-red-900 flex items-center gap-2 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Expired Burials
            </h2>
            
            {expiredBurials.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-slate-500 font-medium">No expired burials</p>
                <p className="text-sm text-slate-400 mt-1">Great! All burials are current</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expiredBurials.map((burial) => (
                  <div 
                    key={burial.id} 
                    className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 text-lg">
                          {burial.first_name} {burial.last_name}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            Plot #{burial.plot_id}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Buried: {burial.burial_date}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="inline-block px-3 py-1 bg-red-200 text-red-900 rounded-full text-sm font-bold">
                          EXPIRED
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Expired: {burial.expiration_date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reserved Plots Tab */}
        {activeTab === 'reserved' && (
          <div>
            <h2 className="text-xl font-semibold text-green-900 flex items-center gap-2 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Reserved Plots
            </h2>
            
            {reservedPlots.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-slate-500 font-medium">No reserved plots</p>
                <p className="text-sm text-slate-400 mt-1">No active plot reservations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reservedPlots.map((plot) => (
                  <div 
                    key={plot.id} 
                    className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 text-lg">
                          Plot #{plot.plot_number}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {plot.reserved_by}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(plot.reserved_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <div className="inline-block px-3 py-1 bg-green-200 text-green-900 rounded-full text-sm font-bold">
                          {Math.floor(plot.days_until_expiry)} days left
                        </div>
                        <p className="text-xs text-slate-500">Expires: {new Date(plot.reservation_expiry).toLocaleDateString()}</p>
                        <button
                          onClick={() => cancelReservation(plot.id)}
                          className="mt-2 px-4 py-1.5 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors font-medium"
                        >
                          Cancel Reservation
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
