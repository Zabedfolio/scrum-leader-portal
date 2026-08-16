'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AttendanceGrid from '@/components/grid/AttendanceGrid';
import Loader from '@/components/shared/Loader';
import { getWeekBoundariesBD } from '@/lib/time';
import { useUI } from '@/lib/UIContext';
import { useAuth } from '@/lib/AuthContext';
import { TriangleExclamation } from '@gravity-ui/icons';

export default function AttendancePage() {
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gridLoading, setGridLoading] = useState(false);
  const { toast, platformMode } = useUI();
  const { user } = useAuth();

  // Manual Session Creation States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState('');
  const [newSessionType, setNewSessionType] = useState('Day');
  const [creatingSession, setCreatingSession] = useState(false);
  const [modalError, setModalError] = useState('');

  const handleOpenAddSession = () => {
    const date = new Date();
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const bstDate = new Date(utc + 3600000 * 6);
    const yyyy = bstDate.getFullYear();
    const mm = String(bstDate.getMonth() + 1).padStart(2, '0');
    const dd = String(bstDate.getDate()).padStart(2, '0');
    
    setNewSessionDate(`${yyyy}-${mm}-${dd}`);
    setNewSessionType(platformMode === 'team' ? '10:00 AM' : 'Day');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!selectedTeamId) return;
    setCreatingSession(true);
    setModalError('');

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: selectedTeamId,
          date: newSessionDate,
          sessionType: newSessionType,
          isTeamOnly: platformMode === 'team',
        }),
      });

      if (res.ok) {
        toast('Attendance session created manually!', 'success');
        setIsModalOpen(false);
        fetchGridData();
      } else {
        const data = await res.json();
        setModalError(data.error || 'Failed to create session');
      }
    } catch (err) {
      console.error(err);
      setModalError('Network error occurred.');
    } finally {
      setCreatingSession(false);
    }
  };

  // Week selection states (represented by a date object inside the target week)
  const [weekPivotDate, setWeekPivotDate] = useState(new Date());
  const [weekLabel, setWeekLabel] = useState('');
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');

  // Calculate week boundaries based on pivot date
  useEffect(() => {
    // get boundaries in UTC derived from BST
    const { startOfWeek, endOfWeek } = getWeekBoundariesBD(weekPivotDate);
    
    // We adjust back to BST representation on client for displaying date ranges
    const formatDisplay = (d) => {
      // Shift UTC date to BST to read correct day/month wall clock
      const bstTime = d.getTime() + 3600000 * 6;
      const bstDate = new Date(bstTime);
      return bstDate.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
    };

    setWeekLabel(`${formatDisplay(startOfWeek)} — ${formatDisplay(endOfWeek)}`);
    
    // Set ISO string formats (YYYY-MM-DD) for database query filtering
    const toISO = (d) => d.toISOString().split('T')[0];
    setStartDateStr(toISO(startOfWeek));
    setEndDateStr(toISO(endOfWeek));
  }, [weekPivotDate]);

  // Fetch initial teams list
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch('/api/teams');
        if (res.ok) {
          const data = await res.json();
          setTeams(data);
          if (data.length > 0) {
            setSelectedTeamId(data[0]._id);
          }
        }
      } catch (err) {
        console.error('Error fetching teams:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  useEffect(() => {
    if (platformMode === 'team') {
      if (user?.myTeamId) {
        setSelectedTeamId(user.myTeamId);
      } else {
        setSelectedTeamId('');
      }
    } else {
      if (teams.length > 0 && !teams.some(t => t._id === selectedTeamId)) {
        setSelectedTeamId(teams[0]._id);
      }
    }
  }, [platformMode, user, teams]);

  // Fetch members and sessions for the selected team & week
  const fetchGridData = useCallback(async () => {
    if (!selectedTeamId || !startDateStr || !endDateStr) return;
    setGridLoading(true);
    try {
      // 1. Fetch active members for selected team
      const membersRes = await fetch(`/api/members?teamId=${selectedTeamId}`);
      let membersData = [];
      if (membersRes.ok) {
        membersData = await membersRes.json();
        setMembers(membersData);
      }

      // 2. Fetch sessions and attendance records in week range
      const sessionsRes = await fetch(
        `/api/sessions?teamId=${selectedTeamId}&startDate=${startDateStr}&endDate=${endDateStr}&isTeamOnly=${platformMode === 'team'}`
      );
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData);
      }
    } catch (err) {
      console.error('Error loading grid data:', err);
    } finally {
      setGridLoading(false);
    }
  }, [selectedTeamId, startDateStr, endDateStr]);

  useEffect(() => {
    fetchGridData();
  }, [fetchGridData]);

  // Navigate between weeks
  const handlePrevWeek = () => {
    const prev = new Date(weekPivotDate);
    prev.setDate(prev.getDate() - 7);
    setWeekPivotDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(weekPivotDate);
    next.setDate(next.getDate() + 7);
    setWeekPivotDate(next);
  };

  const handleResetToCurrent = () => {
    setWeekPivotDate(new Date());
  };

  // Client-side reactive calculation of weekly red-flags (2 or more absences)
  const redFlaggedMemberIds = React.useMemo(() => {
    const flagged = new Set();
    
    members.forEach((member) => {
      let absences = 0;
      sessions.forEach((session) => {
        const rec = session.records?.find(
          (r) => r.memberId._id === member._id || r.memberId === member._id
        );
        if (rec) {
          if (rec.status === 'absent_not_informed' || rec.status === 'absent_informed') {
            absences++;
          }
        }
      });
      
      if (absences >= 2) {
        flagged.add(member._id);
      }
    });

    return flagged;
  }, [members, sessions]);

  if (loading) {
    return <Loader />;
  }

  if (platformMode === 'team' && !user?.myTeamId) {
    return (
      <div className="space-y-8 animate-slide-up">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Private Team Attendance</h1>
          <p className="text-slate-500 text-sm mt-0.5">Toggle member status and lock daily session records.</p>
        </div>
        
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-100">
            <TriangleExclamation className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-800">Designated Team Required</h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              You haven't designated your owned team yet. Please go to the settings page to select your team and activate the private platform.
            </p>
          </div>
          <div className="pt-2">
            <a
              href="/dashboard/settings"
              className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-3 px-6 rounded-xl shadow-md transition-all uppercase tracking-wider"
            >
              Go to Settings
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            {platformMode === 'team' ? 'Private Team Attendance' : 'Scrum Sheet Grid'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Toggle member status and lock daily session records.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {/* Add Session button */}
          {selectedTeamId && (
            <button
              onClick={handleOpenAddSession}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all uppercase tracking-wider flex items-center gap-1.5"
            >
              Add Session
            </button>
          )}

          {/* Date Boundaries Selector widget */}
          <div className="flex items-center gap-1 sm:gap-2 bg-white border border-slate-100 p-1 sm:p-1.5 rounded-2xl shadow-sm max-w-full overflow-hidden">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 sm:p-2 text-slate-650 hover:bg-slate-50 rounded-xl transition-all font-bold text-xs"
              title="Previous Week"
            >
              &larr; <span className="hidden sm:inline">Prev</span>
            </button>
            
            <div className="px-1 sm:px-4 text-[10px] sm:text-xs font-bold text-slate-700 tracking-tight text-center min-w-[125px] sm:min-w-[200px]">
              {weekLabel || 'Loading range...'}
            </div>
            
            <button
              onClick={handleNextWeek}
              className="p-1.5 sm:p-2 text-slate-650 hover:bg-slate-50 rounded-xl transition-all font-bold text-xs"
              title="Next Week"
            >
              <span className="hidden sm:inline">Next</span> &rarr;
            </button>
            
            <button
              onClick={handleResetToCurrent}
              className="px-2 sm:px-3 py-1 sm:py-1.5 ml-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Team selection tabs */}
      {platformMode !== 'team' && teams.length > 0 ? (
        <div className="border-b border-slate-150 flex gap-1 sm:gap-2 flex-wrap pb-1">
          {teams.map((team) => (
            <button
              key={team._id}
              onClick={() => setSelectedTeamId(team._id)}
              className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-t-2xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all border-b-2 ${
                selectedTeamId === team._id
                  ? 'border-emerald-600 text-emerald-700 bg-white font-extrabold shadow-sm shadow-slate-100/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <span className="inline sm:hidden">{team.teamCode}</span>
              <span className="hidden sm:inline">{team.teamCode} &bull; {team.teamName}</span>
            </button>
          ))}
        </div>
      ) : platformMode === 'team' && selectedTeamId ? (
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex justify-between items-center text-xs">
          <span className="font-semibold text-emerald-800">Viewing Private Attendance Grid:</span>
          <span className="font-extrabold text-emerald-950 uppercase">{teams.find(t => t._id === selectedTeamId)?.teamName || 'Your Team'}</span>
        </div>
      ) : platformMode !== 'team' ? (
        <div className="bg-slate-100 p-6 text-center text-slate-500 rounded-3xl text-sm font-semibold">
          No teams found. Go to "Teams & Members" and create a team first!
        </div>
      ) : null}

      {/* Sheet Grid Loader/Container */}
      {gridLoading ? (
        <Loader />
      ) : selectedTeamId && members.length > 0 ? (
        <AttendanceGrid
          members={members}
          sessions={sessions}
          redFlaggedMemberIds={redFlaggedMemberIds}
          onRefresh={fetchGridData}
        />
      ) : selectedTeamId ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm space-y-3">
          <p className="text-sm font-semibold text-slate-500">
            No active members registered in this team.
          </p>
          <a
            href="/dashboard/members"
            className="inline-block bg-emerald-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-emerald-500/10 hover:bg-emerald-700 transition-colors"
          >
            Add Team Members
          </a>
        </div>
      ) : null}

      {/* Add Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 space-y-5 animate-scale-in relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 transition-colors p-1.5 rounded-full hover:bg-slate-100 flex items-center justify-center font-bold text-lg"
              style={{ lineHeight: 1 }}
            >
              &times;
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-800">Add Scrum Session</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manually append an attendance tracking column for this team.
              </p>
            </div>

            {modalError && (
              <div className="bg-red-50 text-red-750 border border-red-100 rounded-xl px-3 py-2 text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Session Date
                </label>
                <input
                  type="date"
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {platformMode === 'team' ? 'Meeting Time / Label' : 'Session Type'}
                </label>
                {platformMode === 'team' ? (
                  <input
                    type="text"
                    value={newSessionType}
                    onChange={(e) => setNewSessionType(e.target.value)}
                    placeholder="e.g. 10:30 AM or Sprint Sync"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all font-semibold"
                    required
                  />
                ) : (
                  <select
                    value={newSessionType}
                    onChange={(e) => setNewSessionType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all font-semibold"
                  >
                    <option value="Day">Day Session</option>
                    <option value="Afternoon">Afternoon Session</option>
                  </select>
                )}
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 px-4 rounded-xl transition-all uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSession}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-md transition-all uppercase tracking-wider"
                >
                  {creatingSession ? 'Creating...' : 'Create Column'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
