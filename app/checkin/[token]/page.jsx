'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Loader from '@/components/shared/Loader';
import { CircleCheck, CircleXmark, TriangleExclamation } from '@gravity-ui/icons';
import { useUI } from '@/lib/UIContext';

export default function CheckInPage() {
  const { toast } = useUI();
  const params = useParams();
  const token = params?.token;

  const [loading, setLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Wizard steps state
  const [step, setStep] = useState(1); // 1 = Team Selection, 2 = Member Selection, 3 = Success Screen
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [alreadyCheckedInMember, setAlreadyCheckedInMember] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState('');
  const [deviceBlocked, setDeviceBlocked] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyError, setVerifyError] = useState('');

  const fetchSession = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/checkin/${token}`);
      if (res.ok) {
        const data = await res.json();
        if (data.alreadyCheckedInOnDevice) {
          setDeviceBlocked(true);
        } else {
          setSessionInfo(data);
        }
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'This check-in session is not available.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load check-in session. Connection error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    if (token) {
      const blocked = localStorage.getItem(`checked_in_session_${token}`) === 'true';
      if (blocked) {
        setDeviceBlocked(true);
      }
    }
  }, [token]);

  const handleSelectTeam = (team) => {
    setSelectedTeam(team);
    setAlreadyCheckedInMember(null);
    setStep(2);
  };

  const handleSelectMember = (member) => {
    if (member.isCheckedIn) {
      setAlreadyCheckedInMember(member);
      return;
    }
    setSelectedMember(member);
    setVerifyEmail('');
  };

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleGoogleSignIn = (response) => {
    if (response && response.credential) {
      handleSubmitCheckin(null, response.credential);
    }
  };

  useEffect(() => {
    if (googleClientId && typeof window !== 'undefined' && window.google && selectedMember) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleSignIn,
        });

        const btnContainer = document.getElementById("google-signin-btn");
        if (btnContainer) {
          window.google.accounts.id.renderButton(
            btnContainer,
            { theme: "outline", size: "large", text: "signin_with", width: 250 }
          );
        }
      } catch (err) {
        console.error("Google Sign-In initialization failed:", err);
      }
    }
  }, [selectedMember, googleClientId]);

  const handleSubmitCheckin = async (manualEmail = null, idToken = null) => {
    if (!selectedMember) return;
    setSubmitting(true);
    try {
      const emailValue = manualEmail || verifyEmail;
      const res = await fetch(`/api/checkin/${token}/mark-present`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: selectedMember._id,
          email: emailValue,
          idToken: idToken,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubmitSuccessMsg(data.message || "Successfully marked present!");
        localStorage.setItem(`checked_in_session_${token}`, 'true'); // lock this device
        setStep(3);
      } else {
        const data = await res.json();
        setVerifyError(data.error || 'Failed to submit check-in. Try again.');
      }
    } catch (err) {
      console.error(err);
      setVerifyError('Network error. Failed to check in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToTeams = () => {
    setSelectedTeam(null);
    setSelectedMember(null);
    setAlreadyCheckedInMember(null);
    setStep(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Loader />
      </div>
    );
  }

  if (deviceBlocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-emerald-100 shadow-xl p-8 text-center space-y-5 animate-scale-in relative">
          {/* Top-right close cross button */}
          <button
            onClick={() => window.close()}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-full hover:bg-slate-100 flex items-center justify-center"
            title="Close"
          >
            <span className="text-xl font-bold block leading-none">&times;</span>
          </button>

          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
            <CircleCheck className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800">Attendance Recorded</h2>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed px-2">
              Your attendance has already been successfully recorded for this session. To ensure integrity and prevent proxy submissions, multiple check-ins are restricted on a single device.
            </p>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed pt-2 px-2">
              If you face any problem or need to modify your status, please contact your Scrum Leader.
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={() => window.close()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-xs py-3 px-4 rounded-xl shadow-md transition-all"
            >
              Close Tab
            </button>
            <p className="text-[9px] text-slate-400 mt-2 font-medium">
              You can also safely close this browser window.
            </p>
          </div>
          
          <div className="pt-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-t border-slate-50">
            Scrum Portal
          </div>
        </div>
      </div>
    );
  }

  // Error boundary display
  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-red-100 shadow-xl p-8 text-center space-y-4 animate-scale-in">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
            <CircleXmark className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Check-in Unavailable</h2>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">{errorMsg}</p>
          <div className="pt-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Scrum Portal
          </div>
        </div>
      </div>
    );
  }

  const dateLabel = sessionInfo?.date 
    ? new Date(sessionInfo.date).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) 
    : '';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-emerald-100 shadow-xl overflow-hidden transition-all duration-300">
        
        {/* Banner header */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 text-white text-center relative border-b border-emerald-100">
          <h1 className="text-base font-bold tracking-tight">
            {sessionInfo?.isTeamOnly ? 'Team Meeting Check-in' : 'Live Scrum Check-in'}
          </h1>
          <p className="text-[11px] text-emerald-100 font-bold uppercase tracking-wider mt-1">
            {['Day', 'Afternoon'].includes(sessionInfo?.sessionType) ? `${sessionInfo?.sessionType} Session` : sessionInfo?.sessionType} &bull; {dateLabel}
          </p>
        </div>

        {/* Wizard Panel Content */}
        <div className="p-6 space-y-6">
          
          {/* STEP 1: TEAM SELECTION */}
          {step === 1 && (
            <div className="space-y-4 animate-slide-up">
              <div className="text-center">
                <h3 className="text-sm font-bold text-slate-700">Select Your Scrum Team</h3>
                <p className="text-xs text-slate-400 mt-0.5">Find your team below to view members.</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {sessionInfo?.teams?.map((team) => (
                  <button
                    key={team._id}
                    onClick={() => handleSelectTeam(team)}
                    className="w-full p-4 text-left border border-slate-150 rounded-2xl hover:bg-emerald-50/30 hover:border-emerald-200 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-between group"
                  >
                    <div>
                      <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-800 transition-colors">
                        {team.teamCode}
                      </span>
                      <span className="text-xs text-slate-400 font-medium ml-2 block sm:inline">
                        {team.teamName}
                      </span>
                    </div>
                    <span className="text-[10px] bg-slate-100 group-hover:bg-emerald-100 text-slate-500 group-hover:text-emerald-700 font-bold px-2 py-0.5 rounded-full transition-colors">
                      {team.members.length} members
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: MEMBER SELECTION */}
          {step === 2 && (
            <div className="space-y-4 animate-slide-up">
              {alreadyCheckedInMember ? (
                <div className="text-center py-6 space-y-4 animate-scale-in relative">
                  {/* Top-right close cross button */}
                  <button
                    onClick={() => setAlreadyCheckedInMember(null)}
                    className="absolute -top-3 -right-2 text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-full hover:bg-slate-100 flex items-center justify-center"
                    title="Close"
                  >
                    <span className="text-xl font-bold block leading-none">&times;</span>
                  </button>

                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-100">
                    <span className="text-3xl font-extrabold">&times;</span>
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-sm font-bold text-slate-800">Already Checked In</h2>
                    <p className="text-xs text-slate-500 font-semibold px-4 leading-relaxed">
                      <span className="font-extrabold text-emerald-800">{alreadyCheckedInMember.name}</span> has already submitted attendance for this session.
                    </p>
                    <p className="text-xs text-red-600 font-bold px-4 leading-relaxed pt-2">
                      If you face any problem or need to modify your status, please contact your Scrum Leader.
                    </p>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => setAlreadyCheckedInMember(null)}
                      className="px-5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                    >
                      Go Back
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <button
                      onClick={handleBackToTeams}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                    >
                      &larr; Back to Teams
                    </button>
                    <span className="text-xs font-bold text-emerald-800">
                      {selectedTeam?.teamCode}
                    </span>
                  </div>

                  <div className="text-center">
                    <h3 className="text-sm font-bold text-slate-700">Select Your Name</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Find and tap your name in the team list.</p>
                  </div>

                  {/* Members Buttons Grid */}
                  <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {selectedTeam?.members.map((member) => {
                      const isCheckedIn = member.isCheckedIn;
                      const isSelected = selectedMember?._id === member._id;

                      return (
                        <button
                          key={member._id}
                          onClick={() => handleSelectMember(member)}
                          className={`w-full px-4 py-3 border text-left text-xs font-semibold rounded-xl flex items-center justify-between transition-all ${
                            isCheckedIn
                              ? 'bg-slate-50/55 border-slate-200 text-slate-400 hover:bg-slate-100/50'
                              : isSelected
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-100'
                              : 'bg-white border-slate-150 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span>{member.name}</span>
                            {member.role === 'team_leader' && (
                              <span className="text-[8px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded mt-0.5 self-start">
                                Team Leader
                              </span>
                            )}
                          </div>
                          
                          {isCheckedIn ? (
                            <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider">
                              ✓ Present
                            </span>
                          ) : isSelected ? (
                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                              Selected
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {/* Confirm submit button with Email verification */}
                  {selectedMember && (
                    <div className="space-y-4 mt-4 border-t border-slate-100 pt-4 animate-slide-up">
                      {googleClientId ? (
                        <div className="flex flex-col items-center justify-center space-y-2 py-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-center">
                            Sign In with Google to Verify Identity
                          </label>
                          <div id="google-signin-btn" className="mx-auto min-h-[40px] flex items-center justify-center"></div>
                          <p className="text-[9px] text-slate-400 font-medium px-4 text-center leading-normal">
                            This checks your browser's logged-in Google email against your registered email.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-xl text-[10px] text-amber-800 font-semibold leading-normal flex items-start gap-2 text-left">
                            <TriangleExclamation className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span>
                              Google Sign-In is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your env. Falling back to manual verification.
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-left">
                              Verify Your Registered Email *
                            </label>
                            <input
                              type="email"
                              value={verifyEmail}
                              onChange={(e) => setVerifyEmail(e.target.value)}
                              placeholder="e.g. yourname@domain.com"
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                              required
                            />
                          </div>
                          
                          <button
                            onClick={() => handleSubmitCheckin()}
                            disabled={submitting || !verifyEmail}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-sm py-3 px-4 rounded-xl shadow-md transition-all disabled:opacity-50"
                          >
                            {submitting ? 'Checking in...' : `Check in: I'm Present`}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION */}
          {step === 3 && (
            <div className="text-center py-6 space-y-4 animate-scale-in">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-150">
                <CircleCheck className="w-10 h-10 animate-scale-in" />
              </div>
              
              <div>
                <h2 className="text-lg font-bold text-slate-800">Check-in Confirmed!</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Thank you, <span className="font-bold text-emerald-800">{selectedMember?.name}</span>.
                </p>
                <p className="text-xs text-emerald-600 font-bold mt-3">
                  {submitSuccessMsg}
                </p>
              </div>

              <div className="pt-4 flex flex-col gap-2">
                <button
                  onClick={() => {
                    fetchSession(); // reload statuses to reflect changes
                    handleBackToTeams();
                  }}
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center text-[10px] text-slate-400 font-medium uppercase tracking-wider">
          Endgame Program &bull; Scrum Dashboard
        </div>
      </div>

      {verifyError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full bg-white rounded-3xl border border-red-100 shadow-2xl p-6 text-center space-y-4 animate-scale-in relative">
            {/* Top-right close cross button */}
            <button
              onClick={() => setVerifyError('')}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 transition-colors p-1.5 rounded-full hover:bg-slate-100 flex items-center justify-center"
              title="Close"
            >
              <span className="text-xl font-bold block leading-none">&times;</span>
            </button>

            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
              <TriangleExclamation className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-base font-bold text-slate-800">Verification Failed</h2>
              <p className="text-xs text-slate-600 font-semibold leading-relaxed px-2">
                {verifyError}
              </p>
              <p className="text-xs text-amber-700 font-bold leading-relaxed pt-2 px-2">
                Please make sure you are logged into the registered Google account in your browser.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setVerifyError('')}
                className="w-full bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white font-semibold text-xs py-3 px-4 rounded-xl shadow-md transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
