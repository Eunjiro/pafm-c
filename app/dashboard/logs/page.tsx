'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface Log {
  id: number;
  user_email: string | null;
  action: string;
  description: string | null;
  resource_type: string | null;
  resource_id: number | null;
  ip_address: string | null;
  status: string;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    action: '',
    status: '',
    resource_type: '',
    search: '',
    start_date: '',
    end_date: '',
  });
  const [availableFilters, setAvailableFilters] = useState({
    actions: [] as string[],
    resourceTypes: [] as string[],
  });
  const [loading, setLoading] = useState(true);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);

  const fetchFilters = useCallback(async () => {
    try {
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'filters' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch filters');
      }
      
      const data = await response.json();
      setAvailableFilters({
        actions: data.actions || [],
        resourceTypes: data.resourceTypes || [],
      });
    } catch (error) {
      console.error('Error fetching filters:', error);
      // Keep default empty arrays on error
      setAvailableFilters({
        actions: [],
        resourceTypes: [],
      });
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.action && { action: filters.action }),
        ...(filters.status && { status: filters.status }),
        ...(filters.resource_type && { resource_type: filters.resource_type }),
        ...(filters.search && { search: filters.search }),
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
      });

      const response = await fetch(`/api/logs?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      
      const data = await response.json();
      
      // Check for setup message
      if (data.message) {
        setSetupMessage(data.message);
      }
      
      setLogs(data.logs || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      }));
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters.action, filters.status, filters.resource_type, filters.search, filters.start_date, filters.end_date]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, page: 1 });
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      status: '',
      resource_type: '',
      search: '',
      start_date: '',
      end_date: '',
    });
    setPagination({ ...pagination, page: 1 });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">System Activity Logs</h1>
            <p className="text-sm lg:text-base text-slate-600 mt-1">Track and monitor all system activities</p>
          </div>
        </div>

        {/* Setup Message */}
        {setupMessage && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 lg:p-4">
            <div className="flex items-start gap-2 lg:gap-3">
              <svg className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs lg:text-sm font-semibold text-yellow-800">Database Setup Required</h3>
                <p className="text-xs lg:text-sm text-yellow-700 mt-1">{setupMessage}</p>
                <div className="mt-2 bg-yellow-100 rounded-lg p-2 lg:p-3 font-mono text-xs text-yellow-900 overflow-x-auto">
                  npm run db:migrate:logs
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-green-100 p-4 lg:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            <div>
              <label className="block text-xs lg:text-sm font-semibold text-slate-700 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-3 lg:px-4 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-semibold text-slate-700 mb-2">
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 lg:px-4 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Actions</option>
                {(availableFilters.actions || []).map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-semibold text-slate-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 lg:px-4 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Status</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
              </select>
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-semibold text-slate-700 mb-2">
                Resource Type
              </label>
              <select
                value={filters.resource_type}
                onChange={(e) => handleFilterChange('resource_type', e.target.value)}
                className="w-full px-3 lg:px-4 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Types</option>
                {(availableFilters.resourceTypes || []).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-semibold text-slate-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full px-3 lg:px-4 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-semibold text-slate-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-full px-3 lg:px-4 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div className="mt-3 lg:mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="px-3 lg:px-4 py-2 text-xs lg:text-sm font-medium text-green-700 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-green-100 p-4 lg:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 lg:p-3 bg-green-100 rounded-lg">
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs lg:text-sm text-slate-600">Total Logs</p>
                <p className="text-xl lg:text-2xl font-bold text-slate-800">{pagination.total}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-xl shadow-sm border border-green-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-green-100">
              <thead className="bg-gradient-to-r from-green-50 to-green-100">
                <tr>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="hidden md:table-cell px-3 lg:px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="hidden xl:table-cell px-3 lg:px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="hidden 2xl:table-cell px-3 lg:px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-green-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-3 lg:px-6 py-12 text-center text-slate-500">
                      Loading logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 lg:px-6 py-12 text-center text-slate-500">
                      No logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-green-50/50 transition-colors">
                      <td className="px-3 lg:px-6 py-3 whitespace-nowrap text-xs lg:text-sm text-slate-600">
                        <div className="flex flex-col">
                          <span>{new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span className="text-xs text-slate-500">{new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-3 lg:px-6 py-3 text-xs lg:text-sm font-medium text-slate-800">
                        <div className="max-w-[150px] truncate">
                          {log.user_email || 'System'}
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-3">
                        <span className="px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full border border-slate-200 whitespace-nowrap">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-3 lg:px-6 py-3 text-xs lg:text-sm text-slate-600">
                        <div className="max-w-[200px] lg:max-w-[300px] truncate" title={log.description || '-'}>
                          {log.description || '-'}
                        </div>
                      </td>
                      <td className="hidden xl:table-cell px-3 lg:px-6 py-3 whitespace-nowrap text-xs lg:text-sm text-slate-600">
                        {log.resource_type ? (
                          <span>
                            {log.resource_type}
                            {log.resource_id && ` #${log.resource_id}`}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="hidden 2xl:table-cell px-3 lg:px-6 py-3 whitespace-nowrap text-xs lg:text-sm text-slate-600">
                        {log.ip_address || '-'}
                      </td>
                      <td className="px-3 lg:px-6 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                            log.status
                          )}`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && logs.length > 0 && (
            <div className="px-3 lg:px-6 py-4 bg-green-50/50 border-t border-green-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs lg:text-sm text-slate-600 text-center sm:text-left">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} logs
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="px-3 lg:px-4 py-2 text-xs lg:text-sm font-medium text-green-700 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-2 text-xs lg:text-sm text-slate-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 lg:px-4 py-2 text-xs lg:text-sm font-medium text-green-700 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
