'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CircleCheck, CircleXmark, CircleInfo, ChevronDown } from '@gravity-ui/icons';

export default function GridCell({
  record,
  sessionLocked,
  onMarkPresent,
  onMarkNotInformed,
  onMarkInformedClick,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close the popup menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  if (!record) {
    return <td className="p-2 border border-slate-100 bg-slate-50 text-center text-xs text-slate-300">-</td>;
  }

  const { status, points, informedReason } = record;

  const handleCellClick = () => {
    if (sessionLocked) return;
    setShowMenu(!showMenu);
  };

  const selectOption = async (action) => {
    setShowMenu(false);
    if (action === 'present') {
      await onMarkPresent(record._id);
    } else if (action === 'not_informed') {
      await onMarkNotInformed(record._id);
    } else if (action === 'informed') {
      onMarkInformedClick(record);
    }
  };

  // Status Styling mappings
  let cellClass = 'bg-slate-50/50 text-slate-400 hover:bg-slate-100/50';
  let Icon = null;
  let statusLabel = 'Unresolved';

  if (status === 'present') {
    cellClass = 'bg-green-50 text-green-700 hover:bg-green-100/80 border-green-100/30';
    Icon = CircleCheck;
    statusLabel = '+1';
  } else if (status === 'absent_not_informed') {
    cellClass = 'bg-red-50 text-red-700 hover:bg-red-100/80 border-red-100/30';
    Icon = CircleXmark;
    statusLabel = '-1';
  } else if (status === 'absent_informed') {
    cellClass = 'bg-amber-50 text-amber-700 hover:bg-amber-100/80 border-amber-100/30';
    Icon = CircleInfo;
    statusLabel = `0 (${informedReason || 'Inf'})`;
  }

  if (sessionLocked) {
    cellClass = 'bg-slate-100/60 text-slate-400 cursor-not-allowed';
  }

  return (
    <td className="p-1 border border-slate-100 relative min-w-[120px] text-center select-none">
      <div
        onClick={handleCellClick}
        className={`w-full py-3 px-2 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer border ${cellClass}`}
        title={sessionLocked ? 'This session is locked' : 'Click to change attendance'}
      >
        {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
        <span>{statusLabel}</span>
        {!sessionLocked && <ChevronDown className="w-3 h-3 text-slate-400 opacity-60 ml-0.5" />}
      </div>

      {/* Floating Menu Popover */}
      {showMenu && !sessionLocked && (
        <div
          ref={menuRef}
          className="absolute left-1/2 -translate-x-1/2 mt-1 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 p-1.5 z-40 space-y-0.5 text-left animate-scale-in"
        >
          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
            Set Attendance
          </div>
          
          <button
            onClick={() => selectOption('present')}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold text-green-700 hover:bg-green-50 transition-colors"
          >
            <CircleCheck className="w-3.5 h-3.5 text-green-600" />
            Present (+1)
          </button>
          
          <button
            onClick={() => selectOption('not_informed')}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
          >
            <CircleXmark className="w-3.5 h-3.5 text-red-600" />
            Not Informed (-1)
          </button>
          
          <button
            onClick={() => selectOption('informed')}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
          >
            <CircleInfo className="w-3.5 h-3.5 text-amber-600" />
            Informed (0)
          </button>
        </div>
      )}
    </td>
  );
}
