'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, Calendar, Star, Persons, Gear, ArrowRightFromSquare } from '@gravity-ui/icons';
import { useAuth } from '@/lib/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const menuItems = [
    { name: 'Overview', href: '/dashboard', icon: House },
    { name: 'Attendance', href: '/dashboard/attendance', icon: Calendar },
    { name: 'Points Board', href: '/dashboard/points', icon: Star },
    { name: 'Teams & Members', href: '/dashboard/members', icon: Persons },
    { name: 'Settings', href: '/dashboard/settings', icon: Gear },
  ];

  return (
    <aside className="w-64 bg-white border-r border-emerald-100 flex flex-col h-screen sticky top-0">
      {/* Brand Section */}
      <div className="h-16 flex items-center px-6 border-b border-emerald-100 bg-emerald-50/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-emerald-500/20">
            S
          </div>
          <div>
            <h1 className="font-semibold text-emerald-950 text-sm leading-tight">Scrum Portal</h1>
            <span className="text-[10px] text-emerald-600 font-medium tracking-wider uppercase">Leader Console</span>
          </div>
        </div>
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
  );
}
