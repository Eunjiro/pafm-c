'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  external?: boolean; // For full page navigation (cemeteries, mapping)
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: 'Expiration & Renewals',
    href: '/dashboard/expiration',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    name: 'Manage Cemeteries',
    href: '/dashboard/cemeteries-manage',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    // Dispatch event to notify DashboardLayout
    window.dispatchEvent(new CustomEvent('sidebarToggle', { detail: { collapsed: newState } }));
  };

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-gray-900 text-white min-h-screen fixed left-0 top-0 flex flex-col transition-all duration-300 z-50`}>
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-800 flex items-center justify-between">
        <div className={`${isCollapsed ? 'hidden' : 'block'}`}>
          <h1 className="text-2xl font-bold text-white">PAFM-C</h1>
          <p className="text-sm text-gray-400 mt-1">Cemetery Management</p>
        </div>
        {isCollapsed && (
          <div className="text-2xl font-bold text-white">P</div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors ml-auto"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg transition-all duration-200
                ${isActive 
                  ? 'bg-green-600 text-white shadow-lg' 
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }
              `}
              title={isCollapsed ? item.name : ''}
            >
              <span className={`${isActive ? 'text-white' : 'text-gray-400'}`}>
                {item.icon}
              </span>
              <span className={`${isCollapsed ? 'hidden' : 'ml-3'} font-medium`}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-800">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-3`}>
          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className={`${isCollapsed ? 'hidden' : 'ml-3'}`}>
            <p className="text-sm font-medium text-white">Admin</p>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/login';
              }}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
