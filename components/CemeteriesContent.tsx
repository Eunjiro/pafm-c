'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Cemetery {
  id: number;
  name: string;
  city: string;
  state: string;
  total_area: number;
  established_year: number;
  is_active: boolean;
  created_at: Date;
}

export default function CemeteriesContent() {
  const [cemeteries, setCemeteries] = useState<Cemetery[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchCemeteries();
  }, []);

  async function fetchCemeteries() {
    try {
      const response = await fetch('/api/cemeteries');
      const data = await response.json();
      setCemeteries(data.cemeteries || []);
    } catch (error) {
      console.error('Error fetching cemeteries:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      const response = await fetch(`/api/cemeteries/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCemeteries(cemeteries.filter(c => c.id !== id));
        setShowDeleteModal(false);
        setDeleteId(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete cemetery');
      }
    } catch (error) {
      console.error('Error deleting cemetery:', error);
      alert('Failed to delete cemetery');
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cemetery Management</h1>
          <p className="text-gray-600 mt-1">View and manage all cemeteries</p>
        </div>
        <Link
          href="/dashboard/cemeteries/new"
          className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-md"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Cemetery
        </Link>
      </div>

      {cemeteries.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border-2 border-gray-200">
          <svg
            className="mx-auto h-16 w-16 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No cemeteries found</h3>
          <p className="mt-2 text-sm text-gray-500">Get started by creating your first cemetery.</p>
          <div className="mt-6">
            <Link
              href="/dashboard/cemeteries/new"
              className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-sm font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Cemetery
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-lg rounded-xl overflow-hidden border-2 border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Area
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Established
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cemeteries.map((cemetery) => (
                <tr key={cemetery.id} className="hover:bg-green-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{cemetery.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {cemetery.city && cemetery.state
                        ? `${cemetery.city}, ${cemetery.state}`
                        : cemetery.city || cemetery.state || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {cemetery.total_area ? `${cemetery.total_area} sq m` : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {cemetery.established_year || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                        cemetery.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {cemetery.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <Link
                      href={`/dashboard/cemeteries/${cemetery.id}/map`}
                      className="text-green-600 hover:text-green-900 font-medium"
                    >
                      Map
                    </Link>
                    <Link
                      href={`/dashboard/cemeteries/${cemetery.id}/edit`}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      Edit
                    </Link>
                    <button 
                      onClick={() => {
                        setDeleteId(cemetery.id);
                        setShowDeleteModal(true);
                      }}
                      className="text-red-600 hover:text-red-900 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Delete Cemetery</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this cemetery? This action cannot be undone and will also delete all associated plots and burials.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteId(null);
                }}
                className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteId && handleDelete(deleteId)}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold shadow-md"
              >
                Delete Cemetery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
