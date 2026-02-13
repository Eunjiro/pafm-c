'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

interface Permit {
  id: number;
  permit_id: string;
  permit_type: string;
  status: string;
  deceased: {
    first_name: string;
    middle_name?: string;
    last_name: string;
    suffix?: string;
    date_of_birth?: string;
    date_of_death: string;
    gender?: string;
  };
  applicant: {
    name: string;
    email?: string;
    phone?: string;
    relationship?: string;
  };
  preferences: {
    cemetery_name?: string;
    plot_id?: number;
    plot_number?: string;
    layer?: number;
  };
  permit_info: {
    approved_at: string;
    expiry_date?: string;
    document_url?: string;
  };
  created_at: string;
}

export default function PermitsPage() {
  const router = useRouter();
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');

  useEffect(() => {
    fetchPermits();
  }, [statusFilter]);

  async function fetchPermits() {
    try {
      setLoading(true);
      const response = await fetch(`/api/permits?status=${statusFilter}`);
      const data = await response.json();
      setPermits(data.permits || []);
    } catch (error) {
      console.error('Error fetching permits:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleReject(permitId: number) {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    try {
      const response = await fetch(`/api/permits/${permitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejection_reason: reason,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject permit');
      }
      
      alert('Permit rejected');
      fetchPermits();
    } catch (error) {
      console.error('Error rejecting permit:', error);
      alert('Failed to reject permit');
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'assigned':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'burial':
        return '⚰️';
      case 'exhumation':
        return '🔄';
      case 'niche':
        return '🏛️';
      case 'entrance':
        return '🚪';
      default:
        return '📄';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Pending Permits</h1>
            <p className="text-slate-600 mt-1">Review and assign approved burial permits from permit system</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-6">
          <div className="flex flex-wrap gap-2">
            {['pending', 'assigned', 'rejected', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Permits List */}
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading permits...</div>
          ) : permits.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-12 text-center">
              <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-600">No {statusFilter} permits found</p>
            </div>
          ) : (
            permits.map((permit) => (
              <div key={permit.id} className="bg-white rounded-xl shadow-sm border border-purple-100 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{getTypeIcon(permit.permit_type)}</span>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">
                          {permit.deceased.first_name} {permit.deceased.middle_name} {permit.deceased.last_name} {permit.deceased.suffix}
                        </h3>
                        <p className="text-sm text-slate-600">Permit ID: {permit.permit_id}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(permit.status)}`}>
                        {permit.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold mb-1">Deceased Information</p>
                        {permit.deceased.date_of_birth && (
                          <p className="text-sm text-slate-700">Date of Birth: {new Date(permit.deceased.date_of_birth).toLocaleDateString()}</p>
                        )}
                        <p className="text-sm text-slate-700">Date of Death: {new Date(permit.deceased.date_of_death).toLocaleDateString()}</p>
                        {permit.deceased.gender && (
                          <p className="text-sm text-slate-700">Gender: {permit.deceased.gender}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs text-slate-500 font-semibold mb-1">Applicant</p>
                        <p className="text-sm text-slate-700">{permit.applicant.name}</p>
                        {permit.applicant.email && <p className="text-xs text-slate-500">{permit.applicant.email}</p>}
                        {permit.applicant.phone && <p className="text-xs text-slate-500">{permit.applicant.phone}</p>}
                      </div>

                      <div>
                        <p className="text-xs text-slate-500 font-semibold mb-1">Preferences</p>
                        {permit.preferences.cemetery_name && (
                          <p className="text-sm text-slate-700">Cemetery: {permit.preferences.cemetery_name}</p>
                        )}
                        {permit.preferences.plot_number && (
                          <p className="text-sm text-slate-700">Plot: {permit.preferences.plot_number}</p>
                        )}
                        {permit.preferences.layer && (
                          <p className="text-sm text-slate-700">Layer: {permit.preferences.layer}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                      <span>📅 Approved: {new Date(permit.permit_info.approved_at).toLocaleDateString()}</span>
                      {permit.permit_info.expiry_date && (
                        <span>⏰ Expires: {new Date(permit.permit_info.expiry_date).toLocaleDateString()}</span>
                      )}
                      {permit.permit_info.document_url && (
                        <a href={permit.permit_info.document_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                          📄 View Document
                        </a>
                      )}
                    </div>
                  </div>

                  {permit.status === 'pending' && (
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => router.push(`/dashboard/permits/${permit.id}/assign`)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <span>🗺️</span>
                        <span>Assign Plot on Map</span>
                      </button>
                      <button
                        onClick={() => handleReject(permit.id)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
