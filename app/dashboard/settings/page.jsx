'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Gear, CircleCheck, CircleXmark } from '@gravity-ui/icons';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  
  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Form notifications
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    // Validate passwords if changing
    if (newPassword || currentPassword) {
      if (!currentPassword) {
        setError('Please enter your current password to save credentials changes.');
        setSubmitting(false);
        return;
      }
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters long.');
        setSubmitting(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match.');
        setSubmitting(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          ...(currentPassword && { currentPassword, newPassword }),
        }),
      });

      if (res.ok) {
        setSuccess('Profile settings updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        await refreshUser(); // Update navbar user display
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update profile.');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-slide-up max-w-2xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">System Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage console credentials and system defaults.</p>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Gear className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-bold text-slate-800">Admin Account Info</h3>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CircleXmark className="w-4 h-4 text-red-500" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CircleCheck className="w-4 h-4 text-emerald-500" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Leader Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Admin Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@scrum.local"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white"
                required
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Change Password (Leave blank to keep current)</span>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Read Only Environment Settings display */}
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">System Configurations (Enforced via .env)</span>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-500">Public Check-in Link Expiry:</span>
              <span className="font-extrabold text-emerald-800">15 Minutes</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-sm py-3 px-4 rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            {submitting ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
