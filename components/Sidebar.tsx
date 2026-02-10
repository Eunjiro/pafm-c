'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
    name: 'Pending Permits',
    href: '/dashboard/permits',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
  {
    name: 'Activity Logs',
    href: '/dashboard/logs',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
    <aside className={`${isCollapsed ? 'w-20' : 'w-60'} bg-white border-r border-green-100 min-h-screen fixed left-0 top-0 flex flex-col transition-all duration-300 z-50 shadow-xl`}>
      {/* Logo/Header */}
      <div className={`p-6 bg-gradient-to-br from-green-600 to-green-700 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <Image 
              src="/pafm-logo.png" 
              alt="PAFM-C Logo" 
              width={40} 
              height={40}
              className="object-contain drop-shadow-lg rounded-lg"
            />
            <div>
              <h1 className="text-xl font-bold text-white">PAFM-C</h1>
              <p className="text-xs text-green-100 mt-0.5">Cemetery Management</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <Image 
            src="/pafm-logo.png" 
            alt="PAFM-C Logo" 
            width={36} 
            height={36}
            className="object-contain drop-shadow-lg"
          />
        )}
        {!isCollapsed && (
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm"
            title="Collapse sidebar"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Collapsed toggle button */}
      {isCollapsed && (
        <button
          onClick={toggleSidebar}
          className="mx-auto my-4 p-2 rounded-lg bg-green-100 hover:bg-green-200 transition-colors"
          title="Expand sidebar"
        >
          <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-2 bg-gradient-to-b from-green-50/50 to-white">
        {navItems.map((item) => {
          // Check if current path matches or is a sub-route
          let isActive = pathname === item.href;
          
          // Special case: Manage Cemeteries should be active for all cemetery detail pages
          if (item.href === '/dashboard/cemeteries-manage' && pathname?.startsWith('/dashboard/cemeteries/')) {
            isActive = true;
          }
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-4'} py-3.5 rounded-xl transition-all duration-200 relative
                ${isActive 
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-200' 
                  : 'text-slate-700 hover:bg-green-50 hover:text-green-700'
                }
              `}
              title={isCollapsed ? item.name : ''}
            >
              {isActive && !isCollapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
              )}
              <span className={`${isActive ? 'text-white' : 'text-green-600 group-hover:text-green-700'} transition-colors`}>
                {item.icon}
              </span>
              <span className={`${isCollapsed ? 'hidden' : 'ml-3'} font-semibold text-sm`}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 bg-green-50/50 border-t border-green-100">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'px-3'} py-3 bg-white rounded-xl shadow-sm border border-green-100`}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center flex-shrink-0 shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className={`${isCollapsed ? 'hidden' : 'ml-3'}`}>
            <p className="text-sm font-semibold text-slate-800">Admin</p>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/login';
              }}
              className="text-xs text-green-600 hover:text-green-700 font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
