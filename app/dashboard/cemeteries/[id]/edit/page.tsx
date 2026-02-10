'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import dynamic from 'next/dynamic';

const CemeteryMap = dynamic(() => import('@/components/CemeteryMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full rounded-xl overflow-hidden border border-green-200 flex items-center justify-center bg-green-50">
      <p className="text-slate-500">Loading map...</p>
    </div>
  ),
});

interface CemeteryFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  description: string;
  total_area: string;
  latitude: string;
  longitude: string;
  established_year: string;
  is_active: boolean;
}

export default function EditCemeteryPage() {
  const params = useParams();
  const router = useRouter();
  const cemeteryId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<CemeteryFormData>({
    name: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    description: '',
    total_area: '',
    latitude: '',
    longitude: '',
    established_year: '',
    is_active: true,
  });
  const [boundaryCoordinates, setBoundaryCoordinates] = useState<[number, number][]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCemetery();
  }, [cemeteryId]);

  async function fetchCemetery() {
    try {
      const response = await fetch(`/api/cemeteries/${cemeteryId}`);
      if (response.ok) {
        const data = await response.json();
        const cemetery = data.cemetery;
        setFormData({
          name: cemetery.name || '',
          address: cemetery.address || '',
          city: cemetery.city || '',
          state: cemetery.state || '',
          country: cemetery.country || '',
          postal_code: cemetery.postal_code || '',
          description: cemetery.description || '',
          total_area: cemetery.total_area?.toString() || '',
          latitude: cemetery.latitude?.toString() || '',
          longitude: cemetery.longitude?.toString() || '',
          established_year: cemetery.established_year?.toString() || '',
          is_active: cemetery.is_active ?? true,
        });
        if (cemetery.map_coordinates) {
          setBoundaryCoordinates(cemetery.map_coordinates);
        }
      } else {
        alert('Failed to load cemetery');
        router.push('/dashboard/cemeteries');
      }
    } catch (error) {
      console.error('Error fetching cemetery:', error);
      alert('Failed to load cemetery');
      router.push('/dashboard/cemeteries');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    try {
      const payload = {
        name: formData.name,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        country: formData.country || undefined,
        postal_code: formData.postal_code || undefined,
        description: formData.description || undefined,
        total_area: formData.total_area ? parseFloat(formData.total_area) : undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        established_year: formData.established_year ? parseInt(formData.established_year) : undefined,
        is_active: formData.is_active,
        map_coordinates: boundaryCoordinates.length > 0 ? boundaryCoordinates : undefined,
      };

      const response = await fetch(`/api/cemeteries/${cemeteryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        router.push('/dashboard/cemeteries');
      } else {
        const data = await response.json();
        if (data.details) {
          const fieldErrors: Record<string, string> = {};
          data.details.forEach((issue: any) => {
            fieldErrors[issue.path[0]] = issue.message;
          });
          setErrors(fieldErrors);
        } else {
          alert(data.error || 'Failed to update cemetery');
        }
      }
    } catch (error) {
      console.error('Error updating cemetery:', error);
      alert('Failed to update cemetery');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="text-slate-500">Loading cemetery...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Edit Cemetery</h1>
            <p className="text-slate-600 mt-1">Update cemetery information and adjust boundaries</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6 space-y-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Basic Information</h2>
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Cemetery Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">
              Address
            </label>
            <input
              type="text"
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* City, State, Country */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-1">
                City
              </label>
              <input
                type="text"
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-slate-700 mb-1">
                State
              </label>
              <input
                type="text"
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-slate-700 mb-1">
                Country
              </label>
              <input
                type="text"
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          {/* Postal Code */}
          <div>
            <label htmlFor="postal_code" className="block text-sm font-medium text-slate-700 mb-1">
              Postal Code
            </label>
            <input
              type="text"
              id="postal_code"
              value={formData.postal_code}
              onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              className="w-full px-3 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Total Area and Established Year */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="total_area" className="block text-sm font-medium text-slate-700 mb-1">
                Total Area (sq m)
              </label>
              <input
                type="number"
                id="total_area"
                step="0.01"
                value={formData.total_area}
                onChange={(e) => setFormData({ ...formData, total_area: e.target.value })}
                className="w-full px-3 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              {errors.total_area && <p className="text-red-500 text-sm mt-1">{errors.total_area}</p>}
            </div>

            <div>
              <label htmlFor="established_year" className="block text-sm font-medium text-slate-700 mb-1">
                Established Year
              </label>
              <input
                type="number"
                id="established_year"
                value={formData.established_year}
                onChange={(e) => setFormData({ ...formData, established_year: e.target.value })}
                className="w-full px-3 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              {errors.established_year && <p className="text-red-500 text-sm mt-1">{errors.established_year}</p>}
            </div>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="latitude" className="block text-sm font-medium text-slate-700 mb-1">
                Latitude
              </label>
              <input
                type="number"
                id="latitude"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                className="w-full px-3 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="e.g., 40.7128"
              />
              {errors.latitude && <p className="text-red-500 text-sm mt-1">{errors.latitude}</p>}
            </div>

            <div>
              <label htmlFor="longitude" className="block text-sm font-medium text-slate-700 mb-1">
                Longitude
              </label>
              <input
                type="number"
                id="longitude"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                className="w-full px-3 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="e.g., -74.0060"
              />
              {errors.longitude && <p className="text-red-500 text-sm mt-1">{errors.longitude}</p>}
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-green-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-slate-700">
              Active
            </label>
          </div>
          </div>

          {/* Cemetery Boundary Map */}
          <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Cemetery Boundary</h2>
            <p className="text-sm text-slate-600 mb-4">
              Draw or adjust the cemetery boundary on the map. Click on the map to add points, and close the polygon to complete the boundary.
            </p>
            
            <CemeteryMap
              center={
                formData.latitude && formData.longitude
                  ? [parseFloat(formData.latitude), parseFloat(formData.longitude)]
                  : [14.5995, 120.9842]
              }
              onBoundaryChange={setBoundaryCoordinates}
              existingBoundary={boundaryCoordinates}
            />

            {boundaryCoordinates.length > 0 && (
              <p className="text-sm text-green-600 mt-3 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                ✓ Boundary outlined with {boundaryCoordinates.length} points
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard/cemeteries-manage')}
              className="px-6 py-2.5 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 font-medium"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
