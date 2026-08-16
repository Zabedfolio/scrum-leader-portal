'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useUI } from '@/lib/UIContext';
import { Gear, CircleCheck, CircleXmark, Persons, TrashBin } from '@gravity-ui/icons';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { toast, confirm } = useUI();
  
  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [teams, setTeams] = useState([]);
  const [myTeamId, setMyTeamId] = useState(user?.myTeamId || '');

  // Form notifications for profile edit
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getOnlineStatus = (lastActiveAt) => {
    if (!lastActiveAt) return { label: 'Offline', color: 'text-slate-400 bg-slate-50 border-slate-200' };
    const diffMs = new Date() - new Date(lastActiveAt);
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 5) {
      return { label: 'Online', color: 'text-green-700 bg-green-50 border-green-200 animate-pulse' };
    } else if (diffMins < 60) {
      return { label: `${diffMins}m ago`, color: 'text-slate-500 bg-slate-50 border-slate-150' };
    } else {
      const hours = Math.floor(diffMins / 60);
      if (hours < 24) {
        return { label: `${hours}h ago`, color: 'text-slate-500 bg-slate-50 border-slate-150' };
      } else {
        return { label: 'Offline', color: 'text-slate-400 bg-slate-50 border-slate-200' };
      }
    }
  };

  // Admin Management State
  const [adminsList, setAdminsList] = useState([]);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminRole, setAdminRole] = useState('co_admin');
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const fetchAdmins = React.useCallback(async () => {
    try {
      const res = await fetch('/api/auth/admins');
      if (res.ok) {
        const data = await res.json();
        setAdminsList(data);
      }
    } catch (err) {
      console.error('Failed to load admins', err);
    }
  }, []);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch('/api/teams');
        if (res.ok) {
          const data = await res.json();
          setTeams(data);
        }
      } catch (err) {
        console.error('Failed to load teams', err);
      }
    };
    fetchTeams();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAdmins();
  }, [fetchAdmins]);

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
          myTeamId: myTeamId || null,
          ...(currentPassword && { currentPassword, newPassword }),
        }),
      });

      if (res.ok) {
        setSuccess('Profile settings updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        await refreshUser(); // Update navbar user display
        fetchAdmins(); // Refresh admin list
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

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setAdminError('');
    setAdminSuccess('');
    setAddingAdmin(true);

    if (!adminName || !adminEmail || !adminPassword || !adminRole) {
      setAdminError('All fields are required.');
      setAddingAdmin(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          role: adminRole,
        }),
      });

      if (res.ok) {
        setAdminSuccess('Admin/Moderator account created successfully!');
        setAdminName('');
        setAdminEmail('');
        setAdminPassword('');
        setAdminRole('co_admin');
        fetchAdmins();
      } else {
        const data = await res.json();
        setAdminError(data.error || 'Failed to create account.');
      }
    } catch (err) {
      console.error(err);
      setAdminError('An unexpected error occurred.');
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (adminId, adminEmailStr) => {
    const isSelf = user?.email === adminEmailStr;
    if (isSelf) {
      toast('You cannot delete your own admin account!', 'error');
      return;
    }

    const confirmDelete = await confirm(
      'Remove Administrator',
      `Are you sure you want to delete the administrator account for ${adminEmailStr}?`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/auth/admins/${adminId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast('Administrator account removed successfully.', 'success');
        fetchAdmins();
      } else {
        const data = await res.json();
        toast(data.error || 'Failed to delete administrator.', 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Network error occurred.', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-slide-up max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">System Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage console credentials, team ownership, and admin access.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Card: Personal Profile settings */}
        <div className="lg:col-span-6 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
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
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Leader Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
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
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Designated My Team (For Private Platform)
              </label>
              <select
                value={myTeamId}
                onChange={(e) => setMyTeamId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-bold text-slate-700"
              >
                <option value="">-- Select Your Owned Team --</option>
                {teams.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.teamCode} - {t.teamName}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 font-medium">
                This team is used for your private My Team Only attendance sheets, standings charts, and session links.
              </p>
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs py-3 px-4 rounded-xl shadow-sm transition-all disabled:opacity-50 uppercase tracking-wider"
            >
              {submitting ? 'Saving Changes...' : 'Save Profile Settings'}
            </button>
          </form>
        </div>

        {/* Right Card: Administrators & Moderators list/add */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Persons className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-800">Console Admins & Moderators</h3>
            </div>

            {/* Form to add moderator */}
            <form onSubmit={handleCreateAdmin} className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Add Admin/Moderator</span>
              
              {adminError && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-xl text-xs">{adminError}</div>}
              {adminSuccess && <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl text-xs">{adminSuccess}</div>}

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none"
                  required
                />
                <select
                  value={adminRole}
                  onChange={(e) => setAdminRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none font-bold text-slate-700"
                  required
                >
                  <option value="co_admin">Co-Admin (Moderator)</option>
                  <option value="scrum_leader">Scrum Leader (Super-Admin)</option>
                </select>
              </div>

              <input
                type="email"
                placeholder="Email Address"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none"
                required
              />

              <input
                type="password"
                placeholder="Login Password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none"
                required
              />

              <button
                type="submit"
                disabled={addingAdmin}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-sm transition-all"
              >
                {addingAdmin ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            {/* List of Admins */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registered Console Users ({adminsList.length})</span>
              {adminsList.map((admin) => {
                const isSelf = user?.email === admin.email;
                const status = getOnlineStatus(admin.lastActiveAt);
                return (
                  <div
                    key={admin._id}
                    className="flex justify-between items-center p-3.5 rounded-2xl border border-slate-150 bg-white hover:bg-slate-50/20 transition-all"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{admin.name}</span>
                        {isSelf && (
                          <span className="text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-extrabold uppercase">
                            You
                          </span>
                        )}
                        <span className={`text-[8px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 font-semibold">{admin.email}</div>
                      <div className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-800 mt-0.5">
                        {admin.role === 'scrum_leader' ? 'Scrum Leader' : 'Co-Admin'}
                      </div>
                    </div>

                    {!isSelf && (
                      <button
                        onClick={() => handleDeleteAdmin(admin._id, admin.email)}
                        className="p-2 text-slate-400 hover:text-red-750 hover:bg-red-50 rounded-xl transition-all"
                        title="Remove Administrator"
                      >
                        <TrashBin className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
