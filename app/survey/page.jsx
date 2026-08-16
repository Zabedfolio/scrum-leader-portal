'use client';

import React, { useState, useEffect } from 'react';
import { useUI } from '@/lib/UIContext';
import { CircleCheck, CircleXmark, TriangleExclamation } from '@gravity-ui/icons';
import Loader from '@/components/shared/Loader';

export default function SurveyPage() {
  const { toast } = useUI();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [fullName, setFullName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [role, setRole] = useState('Member');

  // Section 2: Availability Check (11:00 AM)
  const [standup11AmSuitable, setStandup11AmSuitable] = useState('Yes, always available');
  const [standup11AmNotSuitableReason, setStandup11AmNotSuitableReason] = useState([]);
  const [standup11AmNotSuitableReasonOther, setStandup11AmNotSuitableReasonOther] = useState('');

  // Section 2: Availability Check (8:30 PM)
  const [standup830PmSuitable, setStandup830PmSuitable] = useState('Yes, always available');
  const [standup830PmNotSuitableReason, setStandup830PmNotSuitableReason] = useState([]);
  const [standup830PmNotSuitableReasonOther, setStandup830PmNotSuitableReasonOther] = useState('');

  // Section 3: Class/Schedule Conflicts
  const [classes1030To1200, setClasses1030To1200] = useState('No');
  const [classes1030To1200Days, setClasses1030To1200Days] = useState([]);
  
  const [commitment800To930, setCommitment800To930] = useState('No');
  const [commitment800To930Details, setCommitment800To930Details] = useState('');

  // Section 4: Alternative Suggestions
  const [preferredTime, setPreferredTime] = useState('');
  const [preferredDays, setPreferredDays] = useState('Weekdays only');

  // Section 5: Open Queries
  const [concernsOrSuggestions, setConcernsOrSuggestions] = useState('');
  const [otherRemarks, setOtherRemarks] = useState('');

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch('/api/public/teams');
        if (res.ok) {
          const data = await res.json();
          setTeams(data);
          if (data.length > 0) {
            setTeamId(data[0]._id);
          }
        } else {
          setErrorMsg('Failed to load teams list.');
        }
      } catch (err) {
        console.error('Error fetching teams:', err);
        setErrorMsg('Network error loading teams.');
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  const handleCheckboxChange = (value, state, setState) => {
    if (state.includes(value)) {
      setState(state.filter((item) => item !== value));
    } else {
      setState([...state, value]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    if (!fullName.trim()) {
      toast('Full Name is required', 'error');
      setSubmitting(false);
      return;
    }

    if (!teamId) {
      toast('Team Name/Number is required', 'error');
      setSubmitting(false);
      return;
    }

    const payload = {
      fullName,
      teamId,
      role,
      standup11AmSuitable,
      standup11AmNotSuitableReason: standup11AmSuitable !== 'Yes, always available' ? standup11AmNotSuitableReason : [],
      standup11AmNotSuitableReasonOther: (standup11AmSuitable !== 'Yes, always available' && standup11AmNotSuitableReason.includes('Other')) ? standup11AmNotSuitableReasonOther : '',
      standup830PmSuitable,
      standup830PmNotSuitableReason: standup830PmSuitable !== 'Yes, always available' ? standup830PmNotSuitableReason : [],
      standup830PmNotSuitableReasonOther: (standup830PmSuitable !== 'Yes, always available' && standup830PmNotSuitableReason.includes('Other')) ? standup830PmNotSuitableReasonOther : '',
      classes1030To1200,
      classes1030To1200Days: classes1030To1200 !== 'No' ? classes1030To1200Days : [],
      commitment800To930,
      commitment800To930Details: commitment800To930 !== 'No' ? commitment800To930Details : '',
      preferredTime,
      preferredDays,
      concernsOrSuggestions,
      otherRemarks,
    };

    try {
      const res = await fetch('/api/public/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSubmitted(true);
        toast('Survey response recorded!', 'success');
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to submit survey. Please try again.');
        toast(errData.error || 'Submission failed.', 'error');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('A network error occurred. Please try again.');
      toast('Network error occurred.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Loader />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-emerald-100 shadow-xl p-8 text-center space-y-6 animate-scale-in">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-150">
            <CircleCheck className="w-10 h-10 animate-scale-in" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-800">Response Recorded!</h2>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed px-4">
              Thank you for filling out the availability survey. Your preferences and conflicts have been recorded and will be used by the Scrum Lead to finalize our meeting schedule.
            </p>
          </div>
          <div className="pt-4">
            <button
              onClick={() => {
                setFullName('');
                setStandup11AmNotSuitableReason([]);
                setStandup11AmNotSuitableReasonOther('');
                setStandup830PmNotSuitableReason([]);
                setStandup830PmNotSuitableReasonOther('');
                setClasses1030To1200Days([]);
                setCommitment800To930Details('');
                setPreferredTime('');
                setConcernsOrSuggestions('');
                setOtherRemarks('');
                setSubmitted(false);
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-xs py-3 px-4 rounded-xl shadow-md transition-all uppercase tracking-wider"
            >
              Submit Another Response
            </button>
          </div>
          <div className="pt-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-t border-slate-50">
            Scrum Portal
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-10 px-4">
      <div className="max-w-xl w-full bg-white rounded-3xl border border-emerald-100 shadow-xl overflow-hidden transition-all duration-300">
        
        {/* Banner header */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 text-white text-center relative border-b border-emerald-100">
          <h1 className="text-xl font-extrabold tracking-tight">Scrum Standup Availability Survey</h1>
          <p className="text-xs text-emerald-100 font-semibold mt-1.5 leading-relaxed max-w-sm mx-auto">
            Please fill out this quick schedule sanity-check form. Your response will help us design the most optimal standup timetable.
          </p>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-6 bg-red-50 text-red-700 border border-red-100 rounded-2xl px-4 py-3 text-xs font-semibold flex items-center gap-2">
            <TriangleExclamation className="w-4 h-4 text-red-500 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* SECTION 1: BASIC INFO */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">1</span>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Basic Info</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Team Name/Number <span className="text-red-500">*</span>
                  </label>
                  {teams.length === 0 ? (
                    <div className="text-xs text-slate-400 py-3 font-semibold">No teams found in DB. Add teams in admin settings.</div>
                  ) : (
                    <select
                      value={teamId}
                      onChange={(e) => setTeamId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all font-semibold"
                      required
                    >
                      {teams.map((team) => (
                        <option key={team._id} value={team._id}>
                          {team.teamCode} - {team.teamName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4 mt-2 h-10 items-center">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="Member"
                        checked={role === 'Member'}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-150 border-slate-300"
                      />
                      Member
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="Team Lead"
                        checked={role === 'Team Lead'}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-150 border-slate-300"
                      />
                      Team Lead
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: AVAILABILITY CHECK */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">2</span>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Availability Check</h3>
            </div>

            {/* 11:00 AM Question */}
            <div className="space-y-3 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
              <label className="text-xs font-bold text-slate-700 block leading-relaxed">
                Is 11:00 AM suitable for your daily standup? <span className="text-red-500">*</span>
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {['Yes, always available', 'Sometimes available', 'No, mostly unavailable'].map((option) => (
                  <label
                    key={option}
                    className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer text-xs font-bold transition-all ${
                      standup11AmSuitable === option
                        ? 'bg-emerald-50/50 border-emerald-500 text-emerald-950 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="standup11Am"
                      value={option}
                      checked={standup11AmSuitable === option}
                      onChange={(e) => setStandup11AmSuitable(e.target.value)}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-150 border-slate-300"
                    />
                    {option.split(',')[0]} {/* Shorten label slightly */}
                  </label>
                ))}
              </div>

              {/* Conditional 11:00 AM reasons */}
              {standup11AmSuitable !== 'Yes, always available' && (
                <div className="pt-3 border-t border-slate-100 mt-2 space-y-3 animate-slide-up">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    If &quot;Sometimes&quot; or &quot;No&quot; for 11:00 AM — why?
                  </span>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      'University classes',
                      'Job/Internship elsewhere',
                      'Sleep schedule',
                      'Other'
                    ].map((reason) => (
                      <label
                        key={reason}
                        className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={standup11AmNotSuitableReason.includes(reason)}
                          onChange={() => handleCheckboxChange(reason, standup11AmNotSuitableReason, setStandup11AmNotSuitableReason)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-150 border-slate-300"
                        />
                        {reason}
                      </label>
                    ))}
                  </div>

                  {standup11AmNotSuitableReason.includes('Other') && (
                    <input
                      type="text"
                      placeholder="Please specify other reason..."
                      value={standup11AmNotSuitableReasonOther}
                      onChange={(e) => setStandup11AmNotSuitableReasonOther(e.target.value)}
                      className="w-full mt-2 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white"
                    />
                  )}
                </div>
              )}
            </div>

            {/* 8:30 PM Question */}
            <div className="space-y-3 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
              <label className="text-xs font-bold text-slate-700 block leading-relaxed">
                Is 8:30 PM suitable for your daily standup? <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {['Yes, always available', 'Sometimes available', 'No, mostly unavailable'].map((option) => (
                  <label
                    key={option}
                    className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer text-xs font-bold transition-all ${
                      standup830PmSuitable === option
                        ? 'bg-emerald-50/50 border-emerald-500 text-emerald-950 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="standup830Pm"
                      value={option}
                      checked={standup830PmSuitable === option}
                      onChange={(e) => setStandup830PmSuitable(e.target.value)}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-150 border-slate-300"
                    />
                    {option.split(',')[0]}
                  </label>
                ))}
              </div>

              {/* Conditional 8:30 PM reasons */}
              {standup830PmSuitable !== 'Yes, always available' && (
                <div className="pt-3 border-t border-slate-100 mt-2 space-y-3 animate-slide-up">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    If &quot;Sometimes&quot; or &quot;No&quot; for 8:30 PM — why?
                  </span>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      'University classes/labs in evening',
                      'Family time',
                      'Tuition/coaching',
                      'Other work commitments',
                      'Other'
                    ].map((reason) => (
                      <label
                        key={reason}
                        className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={standup830PmNotSuitableReason.includes(reason)}
                          onChange={() => handleCheckboxChange(reason, standup830PmNotSuitableReason, setStandup830PmNotSuitableReason)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-150 border-slate-300"
                        />
                        {reason}
                      </label>
                    ))}
                  </div>

                  {standup830PmNotSuitableReason.includes('Other') && (
                    <input
                      type="text"
                      placeholder="Please specify other commitment..."
                      value={standup830PmNotSuitableReasonOther}
                      onChange={(e) => setStandup830PmNotSuitableReasonOther(e.target.value)}
                      className="w-full mt-2 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: CLASS/SCHEDULE CONFLICTS */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">3</span>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Class / Schedule Conflicts</h3>
            </div>

            {/* University classes weekdays */}
            <div className="space-y-3 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
              <label className="text-xs font-bold text-slate-700 block leading-relaxed">
                Do you have regular university classes between 10:30 AM – 12:00 PM on weekdays? <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {['Yes, every day', 'Yes, some days', 'No'].map((option) => (
                  <label
                    key={option}
                    className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer text-xs font-bold transition-all ${
                      classes1030To1200 === option
                        ? 'bg-emerald-50/50 border-emerald-500 text-emerald-950 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="classes1030"
                      value={option}
                      checked={classes1030To1200 === option}
                      onChange={(e) => setClasses1030To1200(e.target.value)}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-150 border-slate-300"
                    />
                    {option}
                  </label>
                ))}
              </div>

              {/* Conditional days of classes */}
              {classes1030To1200 !== 'No' && (
                <div className="pt-3 border-t border-slate-100 mt-2 space-y-3 animate-slide-up">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Which days specifically?
                  </span>
                  
                  <div className="flex flex-wrap gap-3">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu'].map((day) => (
                      <label
                        key={day}
                        className={`flex items-center justify-center min-w-[50px] p-2.5 border rounded-xl cursor-pointer text-xs font-bold transition-all ${
                          classes1030To1200Days.includes(day)
                            ? 'bg-emerald-600 border-emerald-650 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={classes1030To1200Days.includes(day)}
                          onChange={() => handleCheckboxChange(day, classes1030To1200Days, setClasses1030To1200Days)}
                          className="hidden"
                        />
                        {day}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recurring commitments evenings */}
            <div className="space-y-3 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
              <label className="text-xs font-bold text-slate-700 block leading-relaxed">
                Do you have any recurring commitment between 8:00 PM – 9:30 PM? <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {['Yes, every day', 'Yes, some days', 'No'].map((option) => (
                  <label
                    key={option}
                    className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer text-xs font-bold transition-all ${
                      commitment800To930 === option
                        ? 'bg-emerald-50/50 border-emerald-500 text-emerald-950 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="commitment800"
                      value={option}
                      checked={commitment800To930 === option}
                      onChange={(e) => setCommitment800To930(e.target.value)}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-150 border-slate-300"
                    />
                    {option}
                  </label>
                ))}
              </div>

              {/* Conditional commitment details */}
              {commitment800To930 !== 'No' && (
                <div className="pt-3 border-t border-slate-100 mt-2 space-y-2 animate-slide-up">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Which days and what commitment?
                  </label>
                  <input
                    type="text"
                    value={commitment800To930Details}
                    onChange={(e) => setCommitment800To930Details(e.target.value)}
                    placeholder="e.g. Sun/Tue tuition class, Mon work shifts"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: ALTERNATIVE SUGGESTIONS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">4</span>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Alternative Suggestions</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Preferred Time (If other times fail)
                </label>
                <input
                  type="text"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  placeholder="e.g. 10:00 AM, 9:00 PM, etc."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Preferred Standup Days <span className="text-red-500">*</span>
                </label>
                <select
                  value={preferredDays}
                  onChange={(e) => setPreferredDays(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all font-semibold"
                  required
                >
                  <option value="Weekdays only">Weekdays only</option>
                  <option value="Weekdays + Saturday">Weekdays + Saturday</option>
                  <option value="Flexible">Flexible</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 5: OPEN QUERIES */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">5</span>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Open Queries</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Specific concerns, suggestions, or questions about the scrum schedule?
                </label>
                <textarea
                  value={concernsOrSuggestions}
                  onChange={(e) => setConcernsOrSuggestions(e.target.value)}
                  placeholder="Share any concerns regarding schedule, timings, or timezone discrepancies..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Anything else you&apos;d like to raise before we finalize?
                </label>
                <textarea
                  value={otherRemarks}
                  onChange={(e) => setOtherRemarks(e.target.value)}
                  placeholder="Optional remarks or requests..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Submit button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-650/10 transition-all duration-200 disabled:opacity-55"
            >
              {submitting ? 'Submitting Responses...' : 'Submit Schedule Survey'}
            </button>
          </div>

        </form>

        {/* Footer info */}
        <div className="bg-slate-50 border-t border-slate-100 py-4 text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          Scrum Leader Portal &bull; Availability Check
        </div>

      </div>
    </div>
  );
}
