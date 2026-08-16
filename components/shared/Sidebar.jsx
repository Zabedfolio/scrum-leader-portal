'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, Calendar, Star, Persons, Gear, ArrowRightFromSquare, CircleInfo, Link as LinkIcon, Magnifier } from '@gravity-ui/icons';
import { useAuth } from '@/lib/AuthContext';
import { useUI } from '@/lib/UIContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { platformMode, setPlatformMode, sidebarOpen, setSidebarOpen } = useUI();

  // Automatically collapse the mobile drawer after navigation action
  React.useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  const menuItems = [
    { name: 'Overview', href: '/dashboard', icon: House },
    { name: 'Attendance', href: '/dashboard/attendance', icon: Calendar },
    { name: 'Points Board', href: '/dashboard/points', icon: Star },
    { name: platformMode === 'team' ? 'My Team Members' : 'Teams & Members', href: '/dashboard/members', icon: Persons },
    { name: 'Member Directory', href: '/dashboard/directory', icon: Magnifier },
    { name: 'Survey Responses', href: '/dashboard/survey', icon: CircleInfo },
    { name: 'Forms', href: '/dashboard/forms', icon: LinkIcon },
    { name: 'Settings', href: '/dashboard/settings', icon: Gear },
  ];

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 z-50 lg:z-30 w-64 bg-white border-r border-emerald-100 flex flex-col h-screen transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Brand Section */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-emerald-100 bg-emerald-50/30">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Scrum Leader Logo"
              className="w-8 h-8 rounded-lg object-cover shadow-md shadow-emerald-500/10"
            />
            <div>
              <h1 className="font-semibold text-emerald-950 text-sm leading-tight">Scrum Portal</h1>
              <span className="text-[10px] text-emerald-600 font-medium tracking-wider uppercase">Leader Console</span>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-655 p-1 rounded-xl hover:bg-slate-100 flex items-center justify-center font-bold text-lg"
            title="Close Menu"
          >
            &times;
          </button>
        </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100/50'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Mobile User Card & Platform Toggle (Only visible on mobile/drawer) */}
      <div className="lg:hidden p-4 border-t border-emerald-100 bg-emerald-50/10 space-y-4">
        {/* Platform Mode Toggle */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Platform Mode</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold w-full">
            <button
              onClick={() => setPlatformMode('scrum')}
              className={`flex-1 px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider text-[9px] font-extrabold ${
                platformMode === 'scrum'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/10'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Scrum
            </button>
            <button
              onClick={() => setPlatformMode('team')}
              className={`flex-1 px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider text-[9px] font-extrabold ${
                platformMode === 'team'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/10'
                  : 'text-slate-500 hover:text-slate-850'
              }`}
            >
              My Team
            </button>
          </div>
        </div>

        {/* User Card */}
        {user && (
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs border border-emerald-200 shadow-inner">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-850 block">{user.name}</span>
              <span className="text-[9px] text-emerald-600 font-semibold capitalize block">{user.role?.replace('_', ' ')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Logout Footer */}
      <div className="p-4 border-t border-emerald-100 bg-emerald-50/10">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-200"
        >
          <ArrowRightFromSquare className="w-4 h-4 text-red-500" />
          Logout
        </button>
      </div>
    </aside>
    </>
  );
}
