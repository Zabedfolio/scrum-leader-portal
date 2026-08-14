'use client';

import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getBDTime, formatBDDateString } from '@/lib/time';
import { useUI } from '@/lib/UIContext';

export default function Navbar() {
  const { user } = useAuth();
  const { platformMode, setPlatformMode } = useUI();
  const [bdTimeStr, setBdTimeStr] = React.useState('');

  React.useEffect(() => {
    // Standardize time formatting on the client side to avoid SSR mismatch
    const date = new Date();
    const formatted = formatBDDateString(date);
    setBdTimeStr(`${formatted} (BST)`);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-emerald-100 flex items-center justify-between px-8 sticky top-0 z-30">
      {/* Search / Section title */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800">
          {platformMode === 'team' ? 'Private Team Console' : 'Scrum Leader Console'}
        </h2>
      </div>

      {/* Right User Bar */}
      <div className="flex items-center gap-6">
        {/* Platform Mode Switcher Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold mr-2">
          <button
            onClick={() => setPlatformMode('scrum')}
            className={`px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider text-[9px] font-extrabold ${
              platformMode === 'scrum'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/10'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Scrum
          </button>
          <button
            onClick={() => setPlatformMode('team')}
            className={`px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider text-[9px] font-extrabold ${
              platformMode === 'team'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/10'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            My Team
          </button>
        </div>

        {/* Timezone Clock Widget */}
        <div className="text-right hidden sm:block">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Bangladesh Time</span>
          <span className="text-xs font-semibold text-emerald-800">{bdTimeStr || 'Loading...'}</span>
        </div>

        {/* User Card */}
        {user && (
          <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
            <div className="text-right">
              <span className="text-sm font-semibold text-slate-800 block">{user.name}</span>
              <span className="text-[10px] text-emerald-600 font-medium capitalize block">{user.role?.replace('_', ' ')}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm border border-emerald-200 shadow-inner">
              {user.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
