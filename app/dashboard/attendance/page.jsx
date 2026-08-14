'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AttendanceGrid from '@/components/grid/AttendanceGrid';
import Loader from '@/components/shared/Loader';
import { getWeekBoundariesBD } from '@/lib/time';

export default function AttendancePage() {
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gridLoading, setGridLoading] = useState(false);

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
        `/api/sessions?teamId=${selectedTeamId}&startDate=${startDateStr}&endDate=${endDateStr}`
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

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Scrum Sheet Grid</h1>
          <p className="text-slate-500 text-sm mt-0.5">Toggle member status and lock daily session records.</p>
        </div>

        {/* Date Boundaries Selector widget */}
        <div className="flex items-center gap-2 bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm self-start sm:self-auto">
          <button
            onClick={handlePrevWeek}
            className="p-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-all font-bold text-xs"
            title="Previous Week"
          >
            &larr; Prev
          </button>
          
          <div className="px-4 text-xs font-bold text-slate-700 tracking-tight text-center min-w-[200px]">
            {weekLabel || 'Loading range...'}
          </div>
          
          <button
            onClick={handleNextWeek}
            className="p-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-all font-bold text-xs"
            title="Next Week"
          >
            Next &rarr;
          </button>
          
          <button
            onClick={handleResetToCurrent}
            className="px-3 py-1.5 ml-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
          >
            Today
          </button>
        </div>
      </div>

      {/* Team selection tabs */}
      {teams.length > 0 ? (
        <div className="border-b border-slate-150 flex gap-2 flex-wrap pb-1">
          {teams.map((team) => (
            <button
              key={team._id}
              onClick={() => setSelectedTeamId(team._id)}
              className={`px-5 py-2.5 rounded-t-2xl font-bold text-xs uppercase tracking-wider transition-all border-b-2 ${
                selectedTeamId === team._id
                  ? 'border-emerald-600 text-emerald-700 bg-white font-extrabold shadow-sm shadow-slate-100/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {team.teamCode} &bull; {team.teamName}
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-slate-100 p-6 text-center text-slate-500 rounded-3xl text-sm font-semibold">
          No teams found. Go to "Teams & Members" and create a team first!
        </div>
      )}

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
    </div>
  );
}
