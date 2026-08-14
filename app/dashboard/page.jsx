'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Link as LinkIcon, TriangleExclamation, Persons, Star, CircleCheck, Copy, Sparkles } from '@gravity-ui/icons';
import Loader from '@/components/shared/Loader';
import VisualCharts from '@/components/dashboard/VisualCharts';
import { useUI } from '@/lib/UIContext';

export default function DashboardPage() {
  const { toast } = useUI();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Link generation form state
  const [sessionDate, setSessionDate] = useState('');
  const [sessionType, setSessionType] = useState('Day');
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [generatedExpiry, setGeneratedExpiry] = useState(null);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set default date input to Bangladesh Standard Time YYYY-MM-DD
    const date = new Date();
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const bstDate = new Date(utc + 3600000 * 6);
    const yyyy = bstDate.getFullYear();
    const mm = String(bstDate.getMonth() + 1).padStart(2, '0');
    const dd = String(bstDate.getDate()).padStart(2, '0');
    setSessionDate(`${yyyy}-${mm}-${dd}`);

    fetchStats();
  }, []);

  const handleGenerateLink = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setFormError('');
    setGeneratedLink('');

    try {
      const res = await fetch('/api/sessions/generate-checkin-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: sessionDate, sessionType }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedLink(data.checkInUrl);
        setGeneratedExpiry(new Date(data.expiresAt));
        toast('Check-in link generated successfully!', 'success');
        fetchStats(); // Refresh dashboard session widgets
      } else {
        const errData = await res.json();
        setFormError(errData.error || 'Failed to generate link');
        toast(errData.error || 'Failed to generate link', 'error');
      }
    } catch (err) {
      console.error('Error generating link:', err);
      setFormError('An unexpected error occurred.');
      toast('Failed to generate link.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast('Check-in URL copied to clipboard!', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <Loader />;
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'finalized':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Locked</span>;
      case 'active':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200 animate-pulse">Link Active</span>;
      case 'unfinalized':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">Pending Lock</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">Not Started</span>;
    }
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Page Title Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Console Overview</h1>
        <p className="text-slate-500 text-sm mt-0.5">Summary of today's active sessions and member statuses.</p>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/50">
            <Persons className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Registered Teams</span>
            <span className="text-2xl font-bold text-slate-800">{stats?.totalTeams || 0} Teams</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/50">
            <Persons className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Active Members</span>
            <span className="text-2xl font-bold text-slate-800">{stats?.totalMembers || 0} Members</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
            stats?.flaggedMembers?.length > 0 
              ? 'bg-orange-50 text-orange-600 border-orange-100' 
              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
          }`}>
            <TriangleExclamation className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Members At Risk</span>
            <span className={`text-2xl font-bold ${stats?.flaggedMembers?.length > 0 ? 'text-orange-600' : 'text-slate-800'}`}>
              {stats?.flaggedMembers?.length || 0} Flagged
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Generator vs Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Link Generator */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-800">Check-in Session Generator</h3>
            </div>

            <form onSubmit={handleGenerateLink} className="space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-700 border border-red-100 rounded-2xl px-4 py-3 text-xs font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Session Date</label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Session Interval</label>
                  <select
                    value={sessionType}
                    onChange={(e) => setSessionType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all"
                  >
                    <option value="Day">Day Session</option>
                    <option value="Afternoon">Afternoon Session</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-md shadow-emerald-600/10 transition-all duration-200 disabled:opacity-50"
              >
                {generating ? 'Generating Link...' : 'Create & Generate Check-in Link'}
              </button>
            </form>

            {/* Generated Link Display */}
            {generatedLink && (
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-6 space-y-6 animate-scale-in">
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">Check-in Session is Live!</h4>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Expiry: {generatedExpiry?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                    (expires in {process.env.NEXT_PUBLIC_CHECKIN_LINK_EXPIRY_MINUTES || 45} minutes)
                  </p>
                </div>

                {/* Copy Clipboard Box */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedLink}
                    readOnly
                    className="flex-1 bg-white border border-emerald-200 rounded-xl px-4 py-2 text-xs font-mono text-emerald-800 focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 p-2.5 rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center"
                    title="Copy to clipboard"
                  >
                    {copied ? <CircleCheck className="w-4 h-4 text-emerald-600 animate-scale-in" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center pt-2">
                  <div className="bg-white border border-emerald-100 p-4 rounded-3xl shadow-sm">
                    {/* QR Code dynamically fetched from our backend API */}
                    <img
                      src={`/api/sessions/qr?text=${encodeURIComponent(generatedLink)}`}
                      alt="Check-in QR Code"
                      className="w-40 h-40 object-contain rounded-xl"
                    />
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-3">
                    Scan in live meeting to register presence
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Today's Status per Team */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Session Grid Status */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-800">Today's Sessions</h3>
              </div>
            </div>

            <div className="space-y-4 divide-y divide-slate-100">
              {stats?.sessionStatuses?.map((team) => (
                <div key={team.teamId} className="pt-4 first:pt-0 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-800">{team.teamCode}</span>
                    <span className="text-xs text-slate-400 font-semibold">{team.teamName}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3 flex flex-col items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Day</span>
                      {getStatusBadge(team.Day.status)}
                    </div>
                    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3 flex flex-col items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Afternoon</span>
                      {getStatusBadge(team.Afternoon.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Visual Analytics Charts */}
      <VisualCharts
        attendanceTrends={stats?.attendanceTrends || []}
        teamPointsData={stats?.teamPointsData || []}
      />

      {/* Flagged/Warning Members section */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2">
          <TriangleExclamation className="w-5 h-5 text-orange-500" />
          <h3 className="text-base font-bold text-slate-800">At-Risk Standings Alert</h3>
        </div>

        {stats?.flaggedMembers?.length === 0 ? (
          <div className="bg-emerald-50/30 border border-emerald-100 text-emerald-800 text-center rounded-3xl p-8 text-sm font-medium flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
            All scrum members are in good standing this week!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider">
                  <th className="pb-3 pl-4">Member</th>
                  <th className="pb-3">Team</th>
                  <th className="pb-3">Weekly Absences</th>
                  <th className="pb-3">All-Time Not Informed</th>
                  <th className="pb-3 pr-4 text-right">Status Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.flaggedMembers?.map((flag) => (
                  <tr key={flag._id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-3.5 pl-4 font-semibold text-slate-800">{flag.name}</td>
                    <td className="py-3.5 text-slate-500">{flag.teamCode}</td>
                    <td className="py-3.5 text-slate-600 font-medium">{flag.weeklyAbsences} absences</td>
                    <td className="py-3.5 text-slate-600 font-medium">{flag.allTimeNotInformed} days</td>
                    <td className="py-3.5 pr-4 text-right">
                      <div className="flex justify-end gap-1.5 flex-wrap">
                        {flag.weeklyRedFlag && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-800 border border-red-200">
                            Weekly Alert
                          </span>
                        )}
                        {flag.isOrangeWarning && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-orange-100 text-orange-700 border border-orange-200">
                            Warning
                          </span>
                        )}
                        {flag.isRedAtRisk && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700 border border-red-200 animate-pulse">
                            At Risk of Removal
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
