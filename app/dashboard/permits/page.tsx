'use client';

import { useState, useEffect } from 'react';
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
    date_of_death: string;
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
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  // Assignment form state
  const [plotId, setPlotId] = useState('');
  const [layer, setLayer] = useState('1');
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  async function handleAssign() {
    if (!selectedPermit || !plotId) return;
    
    try {
      setSubmitting(true);
      const response = await fetch(`/api/permits/${selectedPermit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          plot_id: parseInt(plotId),
          layer: parseInt(layer),
          admin_notes: adminNotes,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to assign permit');
      }
      
      alert('Permit assigned successfully!');
      setShowAssignModal(false);
      setSelectedPermit(null);
      fetchPermits();
    } catch (error) {
      console.error('Error assigning permit:', error);
      alert('Failed to assign permit');
    } finally {
      setSubmitting(false);
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
                        <p className="text-sm text-slate-700">Date of Death: {new Date(permit.deceased.date_of_death).toLocaleDateString()}</p>
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
                        onClick={() => {
                          setSelectedPermit(permit);
                          setPlotId(permit.preferences.plot_id?.toString() || '');
                          setLayer(permit.preferences.layer?.toString() || '1');
                          setShowAssignModal(true);
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                      >
                        Assign Plot
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

      {/* Assign Modal */}
      {showAssignModal && selectedPermit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Assign Burial Plot</h2>
            
            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-2">
                Assigning permit for: <span className="font-semibold">{selectedPermit.deceased.first_name} {selectedPermit.deceased.last_name}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Plot ID *
                </label>
                <input
                  type="number"
                  value={plotId}
                  onChange={(e) => setPlotId(e.target.value)}
                  className="w-full px-4 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter plot ID"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Layer
                </label>
                <input
                  type="number"
                  value={layer}
                  onChange={(e) => setLayer(e.target.value)}
                  min="1"
                  className="w-full px-4 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Admin Notes
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Optional notes..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAssign}
                disabled={!plotId || submitting}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {submitting ? 'Assigning...' : 'Confirm Assignment'}
              </button>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedPermit(null);
                }}
                disabled={submitting}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
