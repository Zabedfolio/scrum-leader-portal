'use client';

import React from 'react';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Sidebar from '@/components/shared/Sidebar';
import Navbar from '@/components/shared/Navbar';
import Loader from '@/components/shared/Loader';

import { useRouter } from 'next/navigation';

function DashboardLayoutContent({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center w-full">
        <Loader />
      </div>
    );
  }

  // Backup guard: middleware takes care of this, but here to prevent flash rendering
  if (!user) {
    return null;
  }

  return (
    <div className="flex bg-slate-50 min-h-screen">
      {/* Pinned Left Sidebar */}
      <Sidebar />
      
      {/* Right Content Space */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <AuthProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </AuthProvider>
  );
}
