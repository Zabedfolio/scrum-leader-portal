'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Loader from '@/components/shared/Loader';
import { Magnifier, House } from '@gravity-ui/icons';

export default function DirectoryPage() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('All');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchDirectory = async () => {
      try {
        const res = await fetch('/api/public/directory');
        if (res.ok) {
          const data = await res.json();
          setPeople(data);
        } else {
          setErrorMsg('Failed to load portal directory.');
        }
      } catch (err) {
        console.error('Error fetching directory:', err);
        setErrorMsg('Network error occurred.');
      } finally {
        setLoading(false);
      }
    };
    fetchDirectory();
  }, []);

  // Filter list based on search query and team filter
  const filteredPeople = people.filter((person) => {
    const matchesSearch = person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTeam = selectedTeam === 'All' || 
      (selectedTeam === 'ADMIN' && person.type === 'admin') ||
      person.teamCode === selectedTeam;

    return matchesSearch && matchesTeam;
  });

  // Extract unique team codes for the dropdown filter
  const teamCodes = ['All', 'ADMIN', ...new Set(people.filter(p => p.teamCode !== 'ADMIN').map(p => p.teamCode))];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
      <div className="max-w-4xl w-full space-y-6">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-emerald-100 rounded-3xl p-6 shadow-sm">
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Scrum Portal Directory</h1>
            <p className="text-xs text-slate-500 font-semibold leading-normal">
              Forgot which Gmail you registered? Search your name below to view your registered email address.
            </p>
          </div>
          
          <div className="flex gap-2">
            <Link
              href="/survey"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all uppercase tracking-wider text-center"
            >
              Go to Survey
            </Link>
            <Link
              href="/"
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-3 rounded-xl transition-all flex items-center justify-center"
              title="Home"
            >
              <House className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 border border-red-100 rounded-2xl px-4 py-3 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Filter controls */}
        <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full sm:max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <Magnifier className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all font-semibold"
            />
          </div>

          {/* Team Dropdown Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider whitespace-nowrap">
              Filter Team:
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full sm:w-44 px-3 py-2 rounded-2xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-bold text-slate-700"
            >
              {teamCodes.map((code) => (
                <option key={code} value={code}>
                  {code === 'All' ? 'All Teams' : code === 'ADMIN' ? 'Administration' : `Team ${code}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Directory List Table */}
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
             <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-4 pl-6">Full Name</th>
                  <th className="p-4">Team</th>
                  <th className="p-4">Role</th>
                  <th className="p-4 text-center">Points</th>
                  <th className="p-4 pr-6">Registered Gmail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPeople.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">
                      No members matched your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPeople.map((person) => {
                    // Predefine custom styles based on roles
                    let rowClass = 'hover:bg-slate-50/50';
                    let roleBadgeClass = 'bg-slate-50 text-slate-600 border-slate-200';
                    let teamBadgeClass = 'bg-slate-50 text-slate-600 border-slate-200';

                    if (person.role.includes('Scrum Leader')) {
                      rowClass = 'bg-indigo-50/40 hover:bg-indigo-50/70 border-l-4 border-l-indigo-600';
                      roleBadgeClass = 'bg-indigo-100 text-indigo-850 border-indigo-200 font-extrabold';
                      teamBadgeClass = 'bg-slate-200 text-slate-700 border-slate-300 font-bold';
                    } else if (person.role.includes('Co-Admin')) {
                      rowClass = 'bg-violet-50/20 hover:bg-violet-50/50 border-l-4 border-l-violet-400';
                      roleBadgeClass = 'bg-violet-100 text-violet-850 border-violet-200 font-bold';
                      teamBadgeClass = 'bg-slate-200 text-slate-700 border-slate-300 font-bold';
                    } else if (person.role === 'Team Leader') {
                      rowClass = 'bg-amber-50/40 hover:bg-amber-50/70 border-l-4 border-l-amber-500';
                      roleBadgeClass = 'bg-amber-100 text-amber-850 border-amber-250 font-extrabold';
                      teamBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-100 font-semibold';
                    } else {
                      // Regular Member
                      teamBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-100 font-semibold';
                    }

                    return (
                      <tr key={person._id} className={`transition-colors duration-150 ${rowClass}`}>
                        <td className="p-4 pl-6 font-bold text-slate-800">
                          {person.name}
                        </td>
                        
                        <td className="p-4 font-semibold text-slate-500">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wide border ${teamBadgeClass}`}>
                            {person.teamCode}
                          </span>
                        </td>
                        
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wide border ${roleBadgeClass}`}>
                            {person.role}
                          </span>
                        </td>

                        <td className="p-4 text-center font-bold">
                          {person.points !== null && person.points !== undefined ? (
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] border ${
                              person.points > 0 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : person.points < 0 
                                  ? 'bg-red-50 text-red-750 border-red-200' 
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              {person.points > 0 ? `+${person.points}` : person.points}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-normal italic">-</span>
                          )}
                        </td>
                        
                        <td className="p-4 pr-6 font-mono font-bold text-slate-700 select-all">
                          {person.email || <span className="text-slate-300 font-normal italic">No email registered</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-[10px] text-slate-400 font-medium leading-relaxed max-w-md mx-auto">
          Notice: If your name is missing, or your registered Gmail address is incorrect, please contact the <strong>Scrum Leader</strong> to update your profile in the system.
        </p>

      </div>
    </div>
  );
}
