'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import DashboardLayout from '@/components/DashboardLayout';

const PermitAssignmentMap = dynamic(() => import('@/components/PermitAssignmentMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-[600px] bg-slate-100 animate-pulse rounded-xl" />
});

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
  };
  preferences: {
    cemetery_id?: number;
    cemetery_name?: string;
    section?: string;
    layer?: number;
  };
  permit_info: {
    approved_at: string;
    expiry_date?: string;
  };
}

interface Cemetery {
  id: number;
  name: string;
  map_coordinates: [number, number][];
  latitude: number;
  longitude: number;
}

interface Plot {
  id: number;
  plot_number: string;
  status: string;
  plot_type: string;
  cemetery_id: number;
  map_coordinates: [number, number][];
  layers: number;
  occupied_layers: number;
}

export default function AssignPermitPage() {
  const params = useParams();
  const router = useRouter();
  const permitId = params.id as string;

  const [permit, setPermit] = useState<Permit | null>(null);
  const [cemeteries, setCemeteries] = useState<Cemetery[]>([]);
  const [selectedCemetery, setSelectedCemetery] = useState<Cemetery | null>(null);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<number>(1);
  const [adminNotes, setAdminNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Plot[]>([]);

  useEffect(() => {
    fetchPermit();
    fetchCemeteries();
  }, [permitId]);

  useEffect(() => {
    if (selectedCemetery) {
      fetchPlots(selectedCemetery.id);
    }
  }, [selectedCemetery]);

  async function fetchPermit() {
    try {
      const response = await fetch(`/api/permits?status=all`);
      const data = await response.json();
      const foundPermit = data.permits.find((p: Permit) => p.id === parseInt(permitId));
      
      if (foundPermit) {
        setPermit(foundPermit);
        // Set default layer from preferences
        if (foundPermit.preferences.layer) {
          setSelectedLayer(foundPermit.preferences.layer);
        }
      }
    } catch (error) {
      console.error('Error fetching permit:', error);
    }
  }

  async function fetchCemeteries() {
    try {
      const response = await fetch('/api/cemeteries');
      const data = await response.json();
      setCemeteries(data.cemeteries || []);
      
      // Auto-select preferred cemetery if specified
      if (permit?.preferences.cemetery_id) {
        const preferred = data.cemeteries.find((c: Cemetery) => c.id === permit.preferences.cemetery_id);
        if (preferred) setSelectedCemetery(preferred);
      } else if (data.cemeteries.length > 0) {
        setSelectedCemetery(data.cemeteries[0]);
      }
    } catch (error) {
      console.error('Error fetching cemeteries:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPlots(cemeteryId: number) {
    try {
      const response = await fetch(`/api/plots?cemetery_id=${cemeteryId}`);
      const data = await response.json();
      setPlots(data.plots || []);
    } catch (error) {
      console.error('Error fetching plots:', error);
    }
  }

  async function handleAssign() {
    if (!selectedPlot || !permit) return;

    try {
      setSubmitting(true);
      
      const payload = {
        action: 'assign',
        plot_id: selectedPlot.id,
        layer: selectedLayer,
        admin_notes: adminNotes,
      };
      
      console.log('Sending assignment request:', payload);
      
      const response = await fetch(`/api/permits/${permit.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned non-JSON response: ' + text.substring(0, 100));
      }

      console.log('Response status:', response.status, 'Data:', data);

      if (!response.ok) {
        const errorMsg = data.error || data.message || data.detail || 'Failed to assign permit';
        console.error('API Error Response:', { status: response.status, data });
        throw new Error(errorMsg);
      }

      alert('✅ Permit assigned successfully!');
      router.push('/dashboard/permits');
    } catch (error: any) {
      console.error('Full error object:', error);
      alert(`❌ Failed to assign permit: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.trim()) {
      const filtered = plots.filter(plot => 
        plot.plot_number.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }

  function handleSelectSearchResult(plot: Plot) {
    setSelectedPlot(plot);
    setSearchQuery('');
    setSearchResults([]);
  }

  const availablePlots = plots.filter(p => {
    if (p.status === 'available') return true;
    if (p.status === 'occupied' && p.occupied_layers < p.layers) return true;
    return false;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading permit details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!permit) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-slate-600">Permit not found</p>
          <button
            onClick={() => router.push('/dashboard/permits')}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg"
          >
            Back to Permits
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/dashboard/permits')}
              className="text-purple-600 hover:text-purple-700 mb-2 flex items-center gap-2"
            >
              ← Back to Permits
            </button>
            <h1 className="text-3xl font-bold text-slate-800">Assign Plot to Permit</h1>
            <p className="text-slate-600 mt-1">Select a plot on the map to assign to this permit</p>
          </div>
        </div>

        {/* Permit Info Card */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-sm border border-purple-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                {permit.deceased.first_name} {permit.deceased.middle_name} {permit.deceased.last_name} {permit.deceased.suffix}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-slate-600">Permit ID:</span>
                  <p className="text-slate-800">{permit.permit_id}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Type:</span>
                  <p className="text-slate-800 capitalize">{permit.permit_type}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Applicant:</span>
                  <p className="text-slate-800">{permit.applicant.name}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Date of Death:</span>
                  <p className="text-slate-800">{new Date(permit.deceased.date_of_death).toLocaleDateString()}</p>
                </div>
              </div>
              {permit.preferences.cemetery_name && (
                <div className="mt-3 text-sm">
                  <span className="font-semibold text-slate-600">Preferred Cemetery:</span>
                  <span className="ml-2 text-slate-800">{permit.preferences.cemetery_name}</span>
                  {permit.preferences.section && (
                    <span className="ml-2 text-slate-600">• Section: {permit.preferences.section}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cemetery Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Select Cemetery
          </label>
          <select
            value={selectedCemetery?.id || ''}
            onChange={(e) => {
              const cemetery = cemeteries.find(c => c.id === parseInt(e.target.value));
              setSelectedCemetery(cemetery || null);
              setSelectedPlot(null);
            }}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Choose a cemetery...</option>
            {cemeteries.map(cemetery => (
              <option key={cemetery.id} value={cemetery.id}>
                {cemetery.name}
              </option>
            ))}
          </select>
        </div>

        {/* Map */}
        {selectedCemetery && (
          <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-800">Cemetery Map</h3>
                <p className="text-sm text-slate-600">
                  Click on an available plot (green) to assign
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  📊 Available plots: <span className="font-semibold text-green-600">{availablePlots.length}</span> / {plots.length}
                </p>
              </div>
              
              {selectedPlot && (
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-700">Selected Plot:</p>
                  <p className="text-2xl font-bold text-purple-600">{selectedPlot.plot_number}</p>
                </div>
              )}
            </div>

            {/* Plot Search */}
            <div className="mb-4 relative">
              <div className="relative">
                <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search plot by number..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute z-[1001] mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map(plot => {
                    const isClickable = plot.status === 'available' || (plot.status === 'occupied' && plot.occupied_layers < plot.layers);
                    return (
                      <button
                        key={plot.id}
                        onClick={() => isClickable && handleSelectSearchResult(plot)}
                        disabled={!isClickable}
                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 ${
                          isClickable ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-800">{plot.plot_number}</p>
                            <p className="text-xs text-slate-600 capitalize">{plot.status}</p>
                          </div>
                          <div className="text-right">
                            {plot.layers > 1 && (
                              <p className="text-xs text-slate-600">
                                {plot.occupied_layers || 0} / {plot.layers} layers
                              </p>
                            )}
                            {isClickable ? (
                              <span className="text-xs text-green-600 font-semibold">Available</span>
                            ) : (
                              <span className="text-xs text-red-600 font-semibold">Full</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <PermitAssignmentMap
              cemetery={selectedCemetery}
              plots={plots}
              selectedPlot={selectedPlot}
              onPlotClick={setSelectedPlot}
            />
          </div>
        )}

        {/* Assignment Form */}
        {selectedPlot && (
          <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Complete Assignment</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Plot: {selectedPlot.plot_number}
                </label>
                <p className="text-sm text-slate-600">
                  Status: <span className="capitalize">{selectedPlot.status}</span> • 
                  Layers: {selectedPlot.occupied_layers || 0} / {selectedPlot.layers}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Layer
                </label>
                <select
                  value={selectedLayer}
                  onChange={(e) => setSelectedLayer(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {Array.from({ length: selectedPlot.layers }, (_, i) => i + 1).map(layer => {
                    const isOccupied = layer <= (selectedPlot.occupied_layers || 0);
                    return (
                      <option key={layer} value={layer} disabled={isOccupied}>
                        Layer {layer} {isOccupied ? '(Occupied)' : '(Available)'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes about this assignment..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleAssign}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Assigning...' : '✓ Confirm Assignment'}
                </button>
                <button
                  onClick={() => setSelectedPlot(null)}
                  className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
