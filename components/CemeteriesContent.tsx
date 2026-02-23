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
  // Delete actions removed for cemeteries-manage

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

  // Delete logic removed for cemeteries-manage

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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal removed for cemeteries-manage */}
    </div>
  );
}
