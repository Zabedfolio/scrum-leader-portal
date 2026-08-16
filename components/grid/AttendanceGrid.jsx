'use client';

import React, { useState } from 'react';
import { Lock, CircleCheck, CircleXmark } from '@gravity-ui/icons';
import GridCell from './GridCell';
import InformedModal from './InformedModal';
import { useUI } from '@/lib/UIContext';

export default function AttendanceGrid({
  members,
  sessions,
  redFlaggedMemberIds = new Set(),
  onRefresh,
}) {
  const { toast, confirm } = useUI();
  const [modalState, setModalState] = useState({
    isOpen: false,
    record: null,
    memberName: '',
    sessionLabel: '',
  });

  const handleMarkPresent = async (recordId) => {
    try {
      const res = await fetch(`/api/attendance/${recordId}/mark-present`, {
        method: 'PATCH',
      });
      if (res.ok) {
        onRefresh();
        toast('Marked member present successfully!', 'success');
      } else {
        const data = await res.json();
        toast(data.error || 'Failed to mark present', 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Network error occurred.', 'error');
    }
  };

  const handleMarkNotInformed = async (recordId) => {
    try {
      const res = await fetch(`/api/attendance/${recordId}/mark-not-informed`, {
        method: 'PATCH',
      });
      if (res.ok) {
        onRefresh();
        toast('Member marked absent: Not Informed (-1 point)', 'warning');
      } else {
        const data = await res.json();
        toast(data.error || 'Failed to mark not informed', 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Network error occurred.', 'error');
    }
  };

  const handleInformedClick = (record) => {
    const member = members.find((m) => m._id === record.memberId._id || m._id === record.memberId);
    const session = sessions.find((s) => s._id === record.sessionId);

    const dateStr = session ? new Date(session.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
    const label = `${session?.sessionType} Session (${dateStr})`;

    setModalState({
      isOpen: true,
      record,
      memberName: member ? member.name : 'Unknown Member',
      sessionLabel: label,
    });
  };

  const handleInformedSubmit = async (formData) => {
    const recordId = modalState.record._id;
    try {
      const res = await fetch(`/api/attendance/${recordId}/mark-informed`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onRefresh();
        toast('Member marked absent: Informed (0 points)', 'success');
      } else {
        const data = await res.json();
        toast(data.error || 'Failed to save informed absence', 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Network error occurred.', 'error');
    }
  };

  const handleFinalizeSession = async (session) => {
    // Count unresolved absences in this session
    const unresolvedCount = session.records.filter((r) => r.status === 'unresolved').length;

    let confirmSave = false;
    if (unresolvedCount > 0) {
      confirmSave = await confirm(
        'Confirm Final Save',
        `${unresolvedCount} members have unresolved absences and will be marked "Not Informed" (-1 point). Continue and permanently lock this session?`
      );
    } else {
      confirmSave = await confirm(
        'Confirm Final Save',
        `Are you sure you want to permanently lock this session? Once locked, it cannot be edited at all.`
      );
    }
    
    if (!confirmSave) return;

    try {
      const res = await fetch(`/api/sessions/${session._id}/finalize`, {
        method: 'POST',
      });

      if (res.ok) {
        onRefresh();
        toast('Session finalized and locked successfully!', 'success');
      } else {
        const data = await res.json();
        toast(data.error || 'Failed to lock session', 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Network error occurred.', 'error');
    }
  };

  // Helper to format session date headers
  const formatHeaderDate = (dateString) => {
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString([], { weekday: 'short' });
    const dayNum = date.getDate();
    const month = date.toLocaleDateString([], { month: 'short' });
    return { dayName, dateStr: `${dayNum} ${month}` };
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden flex flex-col">
      {/* Scrollable grid wrapper */}
      <div className="overflow-x-auto custom-scrollbar max-w-full">
        <table className="text-left border-collapse table-fixed" style={{ width: 'max-content', minWidth: '100%' }}>
          <thead>
            {/* Headers row */}
            <tr className="border-b border-emerald-100 bg-emerald-50/20">
              {/* Sticky first column header (desktop only) */}
              <th className="lg:sticky lg:left-0 bg-white border-r border-emerald-100 p-4 font-bold text-xs text-slate-400 uppercase tracking-wider min-w-[155px] sm:min-w-[200px] w-[155px] sm:w-[200px] lg:z-10">
                Scrum Member
              </th>
              
              {sessions.map((session) => {
                const { dayName, dateStr } = formatHeaderDate(session.date);
                return (
                  <th
                    key={session._id}
                    className="p-4 border-r border-slate-100 min-w-[150px] w-[150px] text-center select-none"
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{dayName}</span>
                      <span className="text-xs font-extrabold text-slate-800 leading-tight mt-0.5">{dateStr}</span>
                      
                      <div className="flex items-center gap-1.5 mt-2 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-full">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          {session.sessionType}
                        </span>
                        {session.locked && <Lock className="w-3 h-3 text-emerald-600" />}
                      </div>

                      {/* Finalize Button */}
                      {!session.locked && (
                        <button
                          onClick={() => handleFinalizeSession(session)}
                          className="mt-3 text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 px-3 py-1 rounded-full shadow-sm shadow-emerald-500/5 hover:scale-105 active:scale-95 transition-all"
                          title="Click to Final Save and permanently lock this column"
                        >
                          Lock Column
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}

              {sessions.length === 0 && (
                <th className="p-8 text-center text-sm font-semibold text-slate-400">
                  No sessions found for this week.
                </th>
              )}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-100">
            {members.map((member) => {
              const isRedFlagged = redFlaggedMemberIds.has(member._id);
              
              return (
                <tr
                  key={member._id}
                  className="hover:bg-slate-50/20 transition-colors duration-100 group"
                >
                  {/* Sticky Member name column (desktop only) */}
                  <td className="lg:sticky lg:left-0 bg-white border-r border-emerald-100 p-4 font-semibold text-sm lg:z-10 shadow-[2px_0_5px_rgba(0,0,0,0.01)] lg:group-hover:bg-slate-50/50 transition-colors">
                    <div className="flex flex-col">
                      <span
                        className={`transition-colors ${
                          isRedFlagged ? 'text-red-600 font-extrabold' : 'text-slate-800'
                        }`}
                      >
                        {member.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium capitalize mt-0.5">
                        {member.role?.replace('_', ' ')}
                      </span>
                      {isRedFlagged && (
                        <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider mt-1 animate-pulse">
                          ⚠️ 2+ Absences this week
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Sessions grid cells */}
                  {sessions.map((session) => {
                    const record = session.records.find(
                      (r) => r.memberId._id === member._id || r.memberId === member._id
                    );

                    return (
                      <GridCell
                        key={session._id}
                        record={record}
                        sessionLocked={session.locked}
                        onMarkPresent={handleMarkPresent}
                        onMarkNotInformed={handleMarkNotInformed}
                        onMarkInformedClick={handleInformedClick}
                      />
                    );
                  })}

                  {sessions.length === 0 && (
                    <td className="p-8 text-center text-xs text-slate-400 font-medium">
                      Select date boundaries or generate a check-in link to start tracking.
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Informed Absence Form Modal */}
      <InformedModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        onSubmit={handleInformedSubmit}
        memberName={modalState.memberName}
        sessionLabel={modalState.sessionLabel}
      />
    </div>
  );
}
