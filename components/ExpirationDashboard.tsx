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
      {/* Expiring Soon Section */}
      <section className="bg-white border border-amber-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-amber-900 flex items-center gap-2 mb-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Expiring Soon ({expiringBurials.length})
        </h2>
        
        {expiringBurials.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-3">No burials expiring soon</p>
        ) : (
          <div className="space-y-2">
            {expiringBurials.map((burial) => (
              <div 
                key={burial.id} 
                className="bg-amber-50 p-3 rounded border-l-2 border-amber-400"
              >
                <p className="font-semibold text-gray-900">
                  {burial.first_name} {burial.last_name}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Plot #{burial.plot_id} • {burial.burial_date} • Expires: {burial.expiration_date} ({Math.floor(burial.days_until_expiration)}d)
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Expired Section */}
      <section className="bg-white border border-red-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-red-900 flex items-center gap-2 mb-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Expired ({expiredBurials.length})
        </h2>
        
        {expiredBurials.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-3">No expired burials</p>
        ) : (
          <div className="space-y-2">
            {expiredBurials.map((burial) => (
              <div 
                key={burial.id} 
                className="bg-red-50 p-3 rounded border-l-2 border-red-500"
              >
                <p className="font-semibold text-gray-900">
                  {burial.first_name} {burial.last_name}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Plot #{burial.plot_id} • {burial.burial_date} • Expired: {burial.expiration_date}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reserved Plots Section */}
      <section className="bg-white border border-green-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-green-900 flex items-center gap-2 mb-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Reserved Plots ({reservedPlots.length})
        </h2>
        
        {reservedPlots.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-3">No reserved plots</p>
        ) : (
          <div className="space-y-2">
            {reservedPlots.map((plot) => (
              <div 
                key={plot.id} 
                className="bg-green-50 p-3 rounded border-l-2 border-green-500 flex justify-between items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">Plot #{plot.plot_number}</p>
                  <p className="text-xs text-gray-600 mt-0.5 truncate">
                    {plot.reserved_by} • {new Date(plot.reserved_date).toLocaleDateString()} → {new Date(plot.reservation_expiry).toLocaleDateString()} ({Math.floor(plot.days_until_expiry)}d)
                  </p>
                </div>
                <button
                  onClick={() => cancelReservation(plot.id)}
                  className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 flex-shrink-0"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
