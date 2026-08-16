'use client';

import React, { useState, useEffect } from 'react';
import { useUI } from '@/lib/UIContext';
import Loader from '@/components/shared/Loader';
import { Magnifier, Copy, CircleCheck, Link as LinkIcon, Pencil, TrashBin } from '@gravity-ui/icons';

export default function AdminDirectoryPage() {
  const { toast, confirm } = useUI();
  const [people, setPeople] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('All');
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('http://localhost:3000');

  // Edit member modal states
  const [editingMember, setEditingMember] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTeamId, setEditTeamId] = useState('');
  const [editRole, setEditRole] = useState('member');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const dirRes = await fetch('/api/public/directory');
      const teamsRes = await fetch('/api/teams');
      if (dirRes.ok && teamsRes.ok) {
        const dirData = await dirRes.json();
        const teamsData = await teamsRes.json();
        setPeople(dirData);
        setTeams(teamsData);
      }
    } catch (err) {
      console.error('Error fetching directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    loadData();
  }, []);

  const handleCopyLink = () => {
    const fullLink = `${origin}/directory`;
    navigator.clipboard.writeText(fullLink);
    setCopied(true);
    toast('Public directory link copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // Edit actions
  const handleStartEdit = (member) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditEmail(member.email || '');
    
    // Find matching team ID by teamCode
    const matchedTeam = teams.find(t => t.teamCode === member.teamCode);
    setEditTeamId(matchedTeam ? matchedTeam._id : '');
    setEditRole(member.role === 'Team Leader' ? 'team_leader' : 'member');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingMember) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/members/${editingMember._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          teamId: editTeamId,
          email: editEmail,
          role: editRole,
          isActive: true,
        }),
      });

      if (res.ok) {
        toast('Member details updated successfully!', 'success');
        setEditingMember(null);
        loadData();
      } else {
        const data = await res.json();
        toast(data.error || 'Failed to update member.', 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Network error occurred.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (memberId) => {
    const confirmDelete = await confirm('Remove Member', 'Are you sure you want to delete/deactivate this team member?');
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/members/${memberId}`, { method: 'DELETE' });
      if (res.ok) {
        toast('Member removed successfully!', 'success');
        loadData();
      } else {
        const data = await res.json();
        toast(data.error || 'Failed to remove member.', 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Network error occurred.', 'error');
    }
  };

  // Filter list
  const filteredPeople = people.filter((person) => {
    const matchesSearch = person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTeam = selectedTeam === 'All' || 
      (selectedTeam === 'ADMIN' && person.type === 'admin') ||
      person.teamCode === selectedTeam;

    return matchesSearch && matchesTeam;
  });

  const teamCodes = ['All', 'ADMIN', ...new Set(people.filter(p => p.teamCode !== 'ADMIN').map(p => p.teamCode))];

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header with public share link */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Member Directory</h1>
          <p className="text-slate-500 text-sm mt-0.5">View and manage registered emails of all members.</p>
        </div>

        {/* Public link share widget */}
        <div className="flex items-center gap-2 bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm self-start md:self-auto">
          <div className="flex items-center gap-1.5 pl-3 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-650 max-w-[240px] truncate">
            <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
            <span>{origin}/directory</span>
          </div>
          <button
            onClick={handleCopyLink}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-2 px-3 rounded-xl transition-all uppercase tracking-wider flex items-center gap-1"
          >
            {copied ? (
              <>
                <CircleCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter and Search Box */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-455">
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

      {/* Directory Grid Table */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-4 pl-6 whitespace-nowrap">Full Name</th>
                <th className="p-4 whitespace-nowrap">Team</th>
                <th className="p-4 whitespace-nowrap">Role</th>
                <th className="p-4 text-center whitespace-nowrap">Points</th>
                <th className="p-4 whitespace-nowrap">Registered Gmail</th>
                <th className="p-4 pr-6 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPeople.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-semibold">
                    No members matched search.
                  </td>
                </tr>
              ) : (
                filteredPeople.map((person) => {
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
                    teamBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-100 font-semibold';
                  }

                  return (
                    <tr key={person._id} className={`transition-colors duration-150 ${rowClass}`}>
                      <td className="p-4 pl-6 font-bold text-slate-800 whitespace-nowrap">
                        {person.name}
                      </td>
                      
                      <td className="p-4 font-semibold text-slate-500 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wide border whitespace-nowrap ${teamBadgeClass}`}>
                          {person.teamCode}
                        </span>
                      </td>
                      
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wide border whitespace-nowrap ${roleBadgeClass}`}>
                          {person.role}
                        </span>
                      </td>

                      <td className="p-4 text-center font-bold whitespace-nowrap">
                        {person.points !== null && person.points !== undefined ? (
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] border whitespace-nowrap ${
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
                      
                      <td className="p-4 font-mono font-bold text-slate-700 select-all whitespace-nowrap">
                        {person.email || <span className="text-slate-300 font-normal italic">No email registered</span>}
                      </td>

                      <td className="p-4 pr-6 text-right whitespace-nowrap">
                        {person.type === 'member' ? (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleStartEdit(person)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 rounded-lg hover:bg-slate-100 transition-all"
                              title="Edit Member"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMember(person._id)}
                              className="p-1.5 text-slate-500 hover:text-red-750 rounded-lg hover:bg-red-50 transition-all"
                              title="Delete Member"
                            >
                              <TrashBin className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[10px] font-bold uppercase tracking-wider select-none pr-2">
                            Admin Account
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 space-y-5 animate-scale-in relative">
            <button
              onClick={() => setEditingMember(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 transition-colors p-1.5 rounded-full hover:bg-slate-100 flex items-center justify-center font-bold text-lg"
              style={{ lineHeight: 1 }}
            >
              &times;
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-800">Edit Team Member</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Update member registration details for the directory and survey logins.
              </p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all font-semibold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Assign Team
                </label>
                <select
                  value={editTeamId}
                  onChange={(e) => setEditTeamId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-bold text-slate-700"
                  required
                >
                  <option value="" disabled>Select Team</option>
                  {teams.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.teamCode} - {t.teamName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Registered Email Address (Gmail)
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="member">Standard Member</option>
                  <option value="team_leader">Team Leader</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 px-4 rounded-xl transition-all uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-md transition-all uppercase tracking-wider"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
