import React from 'react';

export default function Loader() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="relative flex items-center justify-center">
        {/* Outer Ring */}
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-100 border-t-emerald-600"></div>
        {/* Logo/Pulse */}
        <div className="absolute rounded-full h-6 w-6 bg-emerald-500/20 animate-pulse"></div>
      </div>
    </div>
  );
}
