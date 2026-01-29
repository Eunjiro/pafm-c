'use client';

import Sidebar from './Sidebar';
import { useState, useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleSidebarToggle = (e: CustomEvent) => {
      setIsSidebarCollapsed(e.detail.collapsed);
    };

    window.addEventListener('sidebarToggle', handleSidebarToggle as EventListener);
    return () => window.removeEventListener('sidebarToggle', handleSidebarToggle as EventListener);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
