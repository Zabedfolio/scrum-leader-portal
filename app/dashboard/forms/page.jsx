'use client';

import React, { useState, useEffect } from 'react';
import { useUI } from '@/lib/UIContext';
import { Copy, CircleCheck } from '@gravity-ui/icons';

export default function FormsPage() {
  const { toast } = useUI();
  const [copiedId, setCopiedId] = useState(null);
  const [origin, setOrigin] = useState('http://localhost:3000');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  // Form list array - easy to add new forms here in the future
  const formsList = [
    {
      id: 'standup-availability',
      title: 'Standup Availability Survey',
      description: 'Used to gather weekday class hours, evening conflicts, standup time slot suitability, and general schedule feedback from team members.',
      path: '/survey',
      badge: 'Public & Active',
    },
    // Future forms can be appended here, e.g.:
    // {
    //   id: 'sprint-retro',
    //   title: 'Sprint Retrospective Feedback',
    //   description: 'Gather feedback on what went well, what could be improved, and actions for next sprint.',
    //   path: '/retro-survey',
    //   badge: 'Draft',
    // }
  ];

  const handleCopyLink = (path, id) => {
    const fullLink = `${origin}${path}`;
    navigator.clipboard.writeText(fullLink);
    setCopiedId(id);
    toast('Form public link copied to clipboard!', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Active Surveys & Forms</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Share these public links with team members. Responses will automatically appear in the respective dashboard tables.
        </p>
      </div>

      {/* Forms Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {formsList.map((form) => {
          const fullUrl = `${origin}${form.path}`;
          const isCopied = copiedId === form.id;

          return (
            <div
              key={form.id}
              className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-emerald-100 hover:shadow-md transition-all duration-200"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-base font-bold text-slate-800">{form.title}</h3>
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-100 animate-pulse">
                    {form.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  {form.description}
                </p>

                {/* URL display box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-600 truncate">
                  {fullUrl}
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button
                  onClick={() => handleCopyLink(form.path, form.id)}
                  className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  {isCopied ? (
                    <>
                      <CircleCheck className="w-3.5 h-3.5 text-emerald-600 animate-scale-in" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Link
                    </>
                  )}
                </button>
                <a
                  href={form.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl text-center shadow-md transition-all uppercase tracking-wider flex items-center justify-center"
                >
                  Open Form
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
