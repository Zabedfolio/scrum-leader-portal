'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Loader from '@/components/shared/Loader';
import { useUI } from '@/lib/UIContext';
import { Persons, Calendar, CircleInfo, CircleCheck, TriangleExclamation } from '@gravity-ui/icons';

export default function SurveyDashboardPage() {
  const { toast, confirm } = useUI();
  const [responses, setResponses] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTeamId, setFilterTeamId] = useState('');
  
  // Modal state for detailed view
  const [selectedResponse, setSelectedResponse] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const responsesRes = await fetch('/api/survey');
        const teamsRes = await fetch('/api/public/teams');

        if (responsesRes.ok && teamsRes.ok) {
          const responsesData = await responsesRes.json();
          const teamsData = await teamsRes.json();
          if (active) {
            setResponses(responsesData);
            setTeams(teamsData);
          }
        } else {
          toast('Failed to load survey data.', 'error');
        }
      } catch (err) {
        console.error('Error loading data:', err);
        toast('Network error loading survey data.', 'error');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => {
      active = false;
    };
  }, [toast]);

  const handleDeleteResponse = async (id) => {
    const isConfirmed = await confirm(
      'Delete Survey Response',
      'Are you sure you want to permanently delete this submission?'
    );
    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/survey/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast('Submission deleted successfully.', 'success');
        setResponses(responses.filter((r) => r._id !== id));
        if (selectedResponse?._id === id) {
          setSelectedResponse(null);
        }
      } else {
        const errData = await res.json();
        toast(errData.error || 'Failed to delete response.', 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Network error deleting response.', 'error');
    }
  };

  // Filter responses
  const filteredResponses = filterTeamId
    ? responses.filter((r) => r.teamId?._id === filterTeamId)
    : responses;

  // Compute metrics
  const totalSubmissions = filteredResponses.length;
  const leadCount = filteredResponses.filter((r) => r.role === 'Team Lead').length;
  const memberCount = filteredResponses.filter((r) => r.role === 'Member').length;
  
  const am11OkCount = filteredResponses.filter((r) => r.standup11AmSuitable === 'Yes, always available').length;
  const am11Percent = totalSubmissions ? Math.round((am11OkCount / totalSubmissions) * 100) : 0;

  const pm830OkCount = filteredResponses.filter((r) => r.standup830PmSuitable === 'Yes, always available').length;
  const pm830Percent = totalSubmissions ? Math.round((pm830OkCount / totalSubmissions) * 100) : 0;

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredResponses.length === 0) {
      toast('No data to export.', 'info');
      return;
    }

    const headers = [
      'Full Name',
      'Team Code',
      'Team Name',
      'Role',
      '11:00 AM Suitability',
      '11:00 AM Reasons',
      '11:00 AM Other Reason',
      '8:30 PM Suitability',
      '8:30 PM Reasons',
      '8:30 PM Other Reason',
      '10:30 AM Classes?',
      'Class Days',
      '8:00 PM Commitments?',
      'Commitment Details',
      'Preferred Time',
      'Preferred Days',
      'Concerns & Suggestions',
      'Other Remarks',
      'Submitted At'
    ];

    const escapeCsv = (val) => {
      if (val === undefined || val === null) return '';
      const str = typeof val === 'object' ? val.join('; ') : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const csvRows = [headers.join(',')];

    filteredResponses.forEach((r) => {
      const row = [
        escapeCsv(r.fullName),
        escapeCsv(r.teamId?.teamCode || 'N/A'),
        escapeCsv(r.teamId?.teamName || 'N/A'),
        escapeCsv(r.role),
        escapeCsv(r.standup11AmSuitable),
        escapeCsv(r.standup11AmNotSuitableReason),
        escapeCsv(r.standup11AmNotSuitableReasonOther),
        escapeCsv(r.standup830PmSuitable),
        escapeCsv(r.standup830PmNotSuitableReason),
        escapeCsv(r.standup830PmNotSuitableReasonOther),
        escapeCsv(r.classes1030To1200),
        escapeCsv(r.classes1030To1200Days),
        escapeCsv(r.commitment800To930),
        escapeCsv(r.commitment800To930Details),
        escapeCsv(r.preferredTime),
        escapeCsv(r.preferredDays),
        escapeCsv(r.concernsOrSuggestions),
        escapeCsv(r.otherRemarks),
        escapeCsv(new Date(r.createdAt).toLocaleString())
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `scrum_availability_survey_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('CSV report downloaded!', 'success');
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Standup Availability Surveys</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Review schedule preferences and conflicts submitted by team members.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all uppercase tracking-wider flex items-center gap-1.5"
          >
            Export Sheet to CSV
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-650 flex items-center justify-center border border-emerald-100">
            <Persons className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Total Responses</span>
            <span className="text-xl font-bold text-slate-800">{totalSubmissions} Submissions</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <CircleInfo className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Role Demographics</span>
            <span className="text-sm font-semibold text-slate-800 block">{leadCount} Leads &bull; {memberCount} Members</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
            am11Percent < 70 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
          }`}>
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">11:00 AM Ok Rate</span>
            <span className="text-xl font-bold text-slate-800">{am11Percent}% Available</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
            pm830Percent < 70 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
          }`}>
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">8:30 PM Ok Rate</span>
            <span className="text-xl font-bold text-slate-800">{pm830Percent}% Available</span>
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Responses Spreadsheet
          </span>

          <select
            value={filterTeamId}
            onChange={(e) => setFilterTeamId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-600 uppercase tracking-wider focus:outline-none"
          >
            <option value="">Show All Teams</option>
            {teams.map((t) => (
              <option key={t._id} value={t._id}>
                {t.teamCode} - {t.teamName}
              </option>
            ))}
          </select>
        </div>

        {filteredResponses.length === 0 ? (
          <div className="text-center text-xs text-slate-450 font-semibold py-12">
            No survey submissions found matching the criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 pl-4">Full Name</th>
                  <th className="pb-3">Team</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">11:00 AM Suitability</th>
                  <th className="pb-3">8:30 PM Suitability</th>
                  <th className="pb-3">10:30 AM Classes?</th>
                  <th className="pb-3">8:00 PM Commitments?</th>
                  <th className="pb-3 text-center pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredResponses.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/20 transition-colors">
                    <td className="py-3.5 pl-4 font-bold text-slate-800">{r.fullName}</td>
                    <td className="py-3.5 font-bold text-emerald-800">{r.teamId?.teamCode || 'N/A'}</td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        r.role === 'Team Lead' 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                          : 'bg-slate-105 text-slate-600 border border-slate-200'
                      }`}>
                        {r.role}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        r.standup11AmSuitable === 'Yes, always available'
                          ? 'bg-green-50 text-green-700 border border-green-150'
                          : r.standup11AmSuitable === 'Sometimes available'
                          ? 'bg-amber-50 text-amber-700 border border-amber-150'
                          : 'bg-red-50 text-red-700 border border-red-150'
                      }`}>
                        {r.standup11AmSuitable.split(',')[0]}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        r.standup830PmSuitable === 'Yes, always available'
                          ? 'bg-green-50 text-green-700 border border-green-150'
                          : r.standup830PmSuitable === 'Sometimes available'
                          ? 'bg-amber-50 text-amber-700 border border-amber-150'
                          : 'bg-red-50 text-red-700 border border-red-150'
                      }`}>
                        {r.standup830PmSuitable.split(',')[0]}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className="font-semibold text-slate-600">
                        {r.classes1030To1200}
                        {r.classes1030To1200Days?.length > 0 && ` (${r.classes1030To1200Days.join(', ')})`}
                      </span>
                    </td>
                    <td className="py-3.5 max-w-[200px] truncate" title={r.commitment800To930Details}>
                      <span className="font-semibold text-slate-600">
                        {r.commitment800To930 === 'No' ? 'No' : r.commitment800To930Details || 'Yes'}
                      </span>
                    </td>
                    <td className="py-3.5 text-center pr-4">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={() => setSelectedResponse(r)}
                          className="px-2.5 py-1 text-[9px] font-bold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all uppercase tracking-wider"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleDeleteResponse(r._id)}
                          className="px-2.5 py-1 text-[9px] font-bold border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-all uppercase tracking-wider"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Response Detail Modal Overlay */}
      {selectedResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="max-w-2xl w-full bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 space-y-6 animate-scale-in max-h-[85vh] overflow-y-auto custom-scrollbar relative">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">{selectedResponse.fullName}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  {selectedResponse.role} &bull; Team {selectedResponse.teamId?.teamCode} ({selectedResponse.teamId?.teamName})
                </p>
              </div>
              <button
                onClick={() => setSelectedResponse(null)}
                className="text-slate-450 hover:text-slate-700 text-xl font-bold transition-all p-1 hover:bg-slate-50 rounded"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-6 text-xs text-slate-700">
              
              {/* Section 2 Details */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Standup Suitability</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 space-y-2">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">11:00 AM Suitable?</span>
                    <span className="font-bold text-slate-800 text-sm block">{selectedResponse.standup11AmSuitable}</span>
                    {selectedResponse.standup11AmNotSuitableReason?.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 mt-2 space-y-1">
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[8px] block">Reasons:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedResponse.standup11AmNotSuitableReason.map((reason) => (
                            <span key={reason} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded text-[9px] font-semibold">
                              {reason === 'Other' && selectedResponse.standup11AmNotSuitableReasonOther
                                ? `Other: ${selectedResponse.standup11AmNotSuitableReasonOther}`
                                : reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 space-y-2">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">8:30 PM Suitable?</span>
                    <span className="font-bold text-slate-800 text-sm block">{selectedResponse.standup830PmSuitable}</span>
                    {selectedResponse.standup830PmNotSuitableReason?.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 mt-2 space-y-1">
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[8px] block">Reasons:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedResponse.standup830PmNotSuitableReason.map((reason) => (
                            <span key={reason} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded text-[9px] font-semibold">
                              {reason === 'Other' && selectedResponse.standup830PmNotSuitableReasonOther
                                ? `Other: ${selectedResponse.standup830PmNotSuitableReasonOther}`
                                : reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3 Details */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Class & Commitment Conflicts</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1.5">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Classes 10:30 AM – 12:00 PM:</span>
                    <span className="font-bold text-slate-800 block">{selectedResponse.classes1030To1200}</span>
                    {selectedResponse.classes1030To1200Days?.length > 0 && (
                      <div className="pt-1.5">
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[8px] block">Days:</span>
                        <span className="font-bold text-slate-700">{selectedResponse.classes1030To1200Days.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1.5">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Commitments 8:00 PM – 9:30 PM:</span>
                    <span className="font-bold text-slate-800 block">{selectedResponse.commitment800To930}</span>
                    {selectedResponse.commitment800To930 !== 'No' && selectedResponse.commitment800To930Details && (
                      <div className="pt-1.5">
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[8px] block">Details:</span>
                        <span className="font-bold text-slate-750">{selectedResponse.commitment800To930Details}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 4 Details */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Alternative Preferences</span>
                <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Preferred Time:</span>
                    <span className="font-bold text-slate-800">{selectedResponse.preferredTime || 'None suggested'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Preferred Days:</span>
                    <span className="font-bold text-slate-800">{selectedResponse.preferredDays}</span>
                  </div>
                </div>
              </div>

              {/* Section 5 Details */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Open Queries & Suggestions</span>
                <div className="space-y-3">
                  {selectedResponse.concernsOrSuggestions && (
                    <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1">
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Concerns, suggestions, or questions:</span>
                      <p className="font-semibold text-slate-855 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-150/50 whitespace-pre-wrap">
                        {selectedResponse.concernsOrSuggestions}
                      </p>
                    </div>
                  )}
                  {selectedResponse.otherRemarks && (
                    <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1">
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Other remarks before finalization:</span>
                      <p className="font-semibold text-slate-855 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-150/50 whitespace-pre-wrap">
                        {selectedResponse.otherRemarks}
                      </p>
                    </div>
                  )}
                  {!selectedResponse.concernsOrSuggestions && !selectedResponse.otherRemarks && (
                    <div className="text-center text-slate-400 py-2 font-semibold">No comments or suggestions provided.</div>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center border-t border-slate-100 pt-3">
              <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">
                Submitted: {new Date(selectedResponse.createdAt).toLocaleString()}
              </span>
              <button
                onClick={() => setSelectedResponse(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all uppercase tracking-wider"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
