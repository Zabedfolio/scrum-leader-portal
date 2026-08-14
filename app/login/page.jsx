'use client';

import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    const res = await login(email, password);
    if (!res.success) {
      setError(res.error || 'Invalid credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-emerald-100 shadow-xl shadow-emerald-100/30 overflow-hidden transition-all duration-300 hover:shadow-emerald-100/50">
        
        {/* Banner header */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 text-white text-center relative">
          {/* Subtle graphic accent */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full -ml-6 -mb-6"></div>
          
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-4 border border-white/20 shadow-md">
            S
          </div>
          <h2 className="text-xl font-bold tracking-tight">Scrum Attendance</h2>
          <p className="text-emerald-100 text-xs mt-1">Management & Points Dashboard</p>
        </div>

        {/* Form area */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-medium animate-fade-in">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@scrum.local"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-sm py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-600/20 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Footer info */}
        <div className="px-8 pb-8 text-center text-[10px] text-slate-400 font-medium uppercase tracking-wider">
          Scrum Leader Portal &bull; Internal Use Only
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginContent />
    </AuthProvider>
  );
}
