'use client';

import React, { useState, useEffect } from 'react';
import Loader from '@/components/shared/Loader';
import { Star, Persons, TriangleExclamation, ArrowRightFromLine } from '@gravity-ui/icons';
import { useUI } from '@/lib/UIContext';

export default function PointsPage() {
  const { toast } = useUI();
  const [summary, setSummary] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Sorting state
  const [sortBy, setSortBy] = useState('totalPoints'); // 'name', 'totalSessions', 'presentCount', 'notInformedCount', 'informedCount', 'totalPoints'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'

  useEffect(() => {
    // Fetch teams
    const fetchTeams = async () => {
      try {
        const res = await fetch('/api/teams');
        if (res.ok) {
          const data = await res.json();
          setTeams(data);
        }
      } catch (err) {
        console.error('Error fetching teams:', err);
      }
    };
    fetchTeams();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const url = selectedTeamId ? `/api/points/summary?teamId=${selectedTeamId}` : '/api/points/summary';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Error fetching points summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [selectedTeamId]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const url = selectedTeamId ? `/api/export?teamId=${selectedTeamId}` : '/api/export';
      // Standard browser download by window.open or dynamic link click
      window.open(url, '_blank');
    } catch (err) {
      console.error('Export error:', err);
      toast('Failed to export CSV report.', 'error');
    } finally {
      setExporting(false);
    }
  };

  // Sort logic
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc'); // default to desc for new sorting fields
    }
  };

  const sortedSummary = React.useMemo(() => {
    const sorted = [...summary];
    sorted.sort((a, b) => {
      let valA, valB;

      if (sortBy === 'name') {
        valA = a.member.name.toLowerCase();
        valB = b.member.name.toLowerCase();
      } else if (sortBy === 'teamCode') {
        valA = a.team?.teamCode.toLowerCase() || '';
        valB = b.team?.teamCode.toLowerCase() || '';
      } else {
        valA = a[sortBy];
        valB = b[sortBy];
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [summary, sortBy, sortOrder]);

  const getRiskBadge = (status) => {
    if (status === 'warning') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-orange-100 text-orange-700 border border-orange-200" title="Exactly -3 points all-time Not Informed absences">
          Warning (-3)
        </span>
      );
    }
    if (status === 'at_risk') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-red-100 text-red-700 border border-red-200 animate-pulse" title="Reached/Exceeded -4 points all-time Not Informed absences">
          At Risk of Removal
        </span>
      );
    }
    return null;
  };

  const getSortIndicator = (field) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? ' ▴' : ' ▾';
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Points Ledger</h1>
          <p className="text-slate-500 text-sm mt-0.5">Scrum session points balances and attendance metrics.</p>
        </div>

        {/* Action button */}
        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-xs px-5 py-3 rounded-2xl shadow-lg shadow-emerald-500/10 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <ArrowRightFromLine className="w-4 h-4" />
          {exporting ? 'Exporting CSV...' : 'Export CSV Report'}
        </button>
      </div>

      {/* Filter and stats overview */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        
        {/* Team filter dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Filter Team:</label>
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all min-w-[200px]"
          >
            <option value="">All Teams (Combined)</option>
            {teams.map((team) => (
              <option key={team._id} value={team._id}>
                {team.teamCode} &bull; {team.teamName}
              </option>
            ))}
          </select>
        </div>

        {/* Aggregated statistics info */}
        <div className="flex gap-6 divide-x divide-slate-100">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Present Value</span>
            <span className="text-sm font-bold text-slate-700 mt-0.5">+1 Point</span>
          </div>
          <div className="flex flex-col pl-6">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Informed Value</span>
            <span className="text-sm font-bold text-slate-750 mt-0.5">0 Points</span>
          </div>
          <div className="flex flex-col pl-6">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Not Informed Value</span>
            <span className="text-sm font-bold text-red-650 mt-0.5">-1 Point</span>
          </div>
        </div>
      </div>

      {/* Points summary Table */}
      {loading ? (
        <Loader />
      ) : sortedSummary.length > 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm table-fixed">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/20 text-slate-400 font-bold text-xs uppercase tracking-wider select-none">
                  <th
                    onClick={() => handleSort('name')}
                    className="p-4 cursor-pointer hover:bg-slate-50 hover:text-slate-800 transition-colors w-[220px]"
                  >
                    Member {getSortIndicator('name')}
                  </th>
                  <th
                    onClick={() => handleSort('teamCode')}
                    className="p-4 cursor-pointer hover:bg-slate-50 hover:text-slate-800 transition-colors w-[110px]"
                  >
                    Team {getSortIndicator('teamCode')}
                  </th>
                  <th
                    onClick={() => handleSort('totalSessions')}
                    className="p-4 cursor-pointer hover:bg-slate-50 hover:text-slate-800 transition-colors text-center w-[120px]"
                  >
                    Sessions {getSortIndicator('totalSessions')}
                  </th>
                  <th
                    onClick={() => handleSort('presentCount')}
                    className="p-4 cursor-pointer hover:bg-slate-50 hover:text-slate-800 transition-colors text-center w-[110px]"
                  >
                    Present {getSortIndicator('presentCount')}
                  </th>
                  <th
                    onClick={() => handleSort('notInformedCount')}
                    className="p-4 cursor-pointer hover:bg-slate-50 hover:text-slate-800 transition-colors text-center w-[130px]"
                  >
                    Not Informed {getSortIndicator('notInformedCount')}
                  </th>
                  <th
                    onClick={() => handleSort('informedCount')}
                    className="p-4 cursor-pointer hover:bg-slate-50 hover:text-slate-800 transition-colors text-center w-[110px]"
                  >
                    Informed {getSortIndicator('informedCount')}
                  </th>
                  <th
                    onClick={() => handleSort('totalPoints')}
                    className="p-4 cursor-pointer hover:bg-emerald-50 hover:text-emerald-800 transition-colors text-center w-[120px] bg-emerald-50/20 font-extrabold text-emerald-950"
                  >
                    Total Points {getSortIndicator('totalPoints')}
                  </th>
                  <th className="p-4 w-[160px] text-right">Status Flag</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-100">
                {sortedSummary.map((item) => (
                  <tr key={item.member._id} className="hover:bg-slate-50/30 transition-colors duration-100">
                    <td className="p-4 font-semibold text-slate-800">
                      <div className="flex flex-col">
                        <span className={item.weeklyRedFlag ? 'text-red-600 font-extrabold' : ''}>
                          {item.member.name}
                        </span>
                        {item.member.role === 'team_leader' && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full mt-1 self-start">
                            Team Leader
                          </span>
                        )}
                      </div>
                    </td>
                    
                    <td className="p-4 text-slate-500 font-medium">{item.team?.teamCode || 'N/A'}</td>
                    <td className="p-4 text-slate-600 text-center font-medium">{item.totalSessions}</td>
                    <td className="p-4 text-green-700 text-center font-bold">+{item.presentCount}</td>
                    <td className="p-4 text-red-600 text-center font-bold">-{item.notInformedCount}</td>
                    <td className="p-4 text-amber-600 text-center font-semibold">{item.informedCount}</td>
                    
                    <td className={`p-4 text-center font-extrabold text-sm border-x border-slate-100 ${
                      item.totalPoints >= 0 
                        ? 'text-emerald-700 bg-emerald-50/10' 
                        : 'text-red-600 bg-red-50/10'
                    }`}>
                      {item.totalPoints}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5 flex-wrap">
                        {item.weeklyRedFlag && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-red-100 text-red-800 border border-red-200">
                            2+ Absences
                          </span>
                        )}
                        {getRiskBadge(item.riskStatus)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm text-slate-500 font-semibold text-sm">
          No records found. Setup teams and members to view points.
        </div>
      )}
    </div>
  );
}
