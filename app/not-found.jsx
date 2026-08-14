import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-emerald-100 shadow-xl p-8 text-center space-y-6 animate-scale-in">
        
        {/* Large stylized 404 number */}
        <div className="relative">
          <h1 className="text-8xl font-black tracking-widest text-slate-100 select-none">
            404
          </h1>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-emerald-800 uppercase tracking-widest mt-2">
            Lost in Space
          </span>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h2 className="text-base font-bold text-slate-800">Page Not Found</h2>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed px-4">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-block bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-xs py-3 px-6 rounded-xl shadow-md shadow-emerald-600/10 transition-all uppercase tracking-wider"
          >
            Go to Dashboard
          </Link>
        </div>

        {/* Footer */}
        <div className="pt-4 text-[10px] text-slate-450 font-bold uppercase tracking-wider border-t border-slate-50">
          Scrum Leader Portal
        </div>
      </div>
    </div>
  );
}
