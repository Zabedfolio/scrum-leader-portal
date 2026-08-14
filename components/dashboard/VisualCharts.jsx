'use client';

import React, { useState } from 'react';
import { Sparkles, Calendar, Persons, Star } from '@gravity-ui/icons';

export default function VisualCharts({ attendanceTrends = [], teamPointsData = [] }) {
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState(null);
  const [hoveredBarIdx, setHoveredBarIdx] = useState(null);

  // --- 1. Attendance Trend calculations (SVG Line/Area Chart) ---
  const trendWidth = 480;
  const trendHeight = 180;
  const trendPaddingTop = 15;
  const trendPaddingBottom = 25;
  const trendPaddingLeft = 35;
  const trendPaddingRight = 15;

  const graphWidth = trendWidth - trendPaddingLeft - trendPaddingRight;
  const graphHeight = trendHeight - trendPaddingTop - trendPaddingBottom;

  const pointsCount = attendanceTrends.length;

  const trendPoints = attendanceTrends.map((d, index) => {
    const x = trendPaddingLeft + (index * (graphWidth / Math.max(1, pointsCount - 1)));
    // Clamp rate between 0 and 100
    const rate = Math.max(0, Math.min(100, d.rate));
    const y = trendPaddingTop + (graphHeight - (rate * graphHeight / 100));
    return { x, y, label: d.label, rate: d.rate };
  });

  // SVG Path generation
  let linePath = '';
  let areaPath = '';
  if (trendPoints.length > 0) {
    linePath = `M ${trendPoints[0].x} ${trendPoints[0].y} ` +
      trendPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');

    areaPath = `${linePath} L ${trendPoints[trendPoints.length - 1].x} ${trendHeight - trendPaddingBottom} L ${trendPoints[0].x} ${trendHeight - trendPaddingBottom} Z`;
  }

  // --- 2. Team Points Comparison calculations (SVG Bar Chart) ---
  const barWidth = 480;
  const barHeight = 180;
  const barPaddingTop = 15;
  const barPaddingBottom = 25;
  const barPaddingLeft = 35;
  const barPaddingRight = 15;

  const bGraphWidth = barWidth - barPaddingLeft - barPaddingRight;
  const bGraphHeight = barHeight - barPaddingTop - barPaddingBottom;

  // Find min and max points to determine baseline
  const pointsValues = teamPointsData.map(d => d.averagePoints);
  const maxVal = Math.max(5, ...pointsValues);
  const minVal = Math.min(0, ...pointsValues);
  
  // Establish padding so Y-axis doesn't hit borders
  const yMax = maxVal + 1;
  const yMin = minVal - 1;
  const yRange = yMax - yMin;

  const getBarY = (val) => {
    const pct = (val - yMin) / yRange;
    return barPaddingTop + (bGraphHeight - (pct * bGraphHeight));
  };

  const zeroY = getBarY(0);

  const teamBars = teamPointsData.map((team, index) => {
    const barWidthSize = Math.min(45, bGraphWidth / (teamPointsData.length || 1) - 25);
    const colWidth = bGraphWidth / (teamPointsData.length || 1);
    const x = barPaddingLeft + (index * colWidth) + (colWidth - barWidthSize) / 2;

    const barY = getBarY(team.averagePoints);
    let y = barY;
    let height = Math.abs(zeroY - barY);

    // If height is tiny, render a minimal line so it is visible
    if (height < 2) height = 2;

    // Determine direction for render (above baseline or below baseline)
    if (team.averagePoints < 0) {
      y = zeroY;
    }

    return {
      x,
      y,
      width: barWidthSize,
      height,
      avg: team.averagePoints,
      total: team.totalPoints,
      code: team.teamCode,
      name: team.teamName,
      members: team.memberCount,
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* 📈 Chart 1: Attendance Rate Trend */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">Scrum Attendance Rate (%)</h3>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Last 7 Sessions
          </span>
        </div>

        <div className="relative w-full h-[180px] mt-2 flex items-center justify-center select-none">
          {pointsCount === 0 ? (
            <div className="text-slate-400 text-xs font-semibold">No session records available yet.</div>
          ) : (
            <svg viewBox={`0 0 ${trendWidth} ${trendHeight}`} className="w-full h-full">
              <defs>
                <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 25, 50, 75, 100].map(val => {
                const y = trendPaddingTop + (graphHeight - (val * graphHeight / 100));
                return (
                  <g key={val}>
                    <line
                      x1={trendPaddingLeft}
                      y1={y}
                      x2={trendWidth - trendPaddingRight}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray={val === 100 ? "0" : "3,3"}
                    />
                    <text
                      x={trendPaddingLeft - 6}
                      y={y + 3}
                      fill="#94a3b8"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      {val}%
                    </text>
                  </g>
                );
              })}

              {/* Gradient Area Fill */}
              {areaPath && (
                <path d={areaPath} fill="url(#trendAreaGrad)" className="transition-all duration-300" />
              )}

              {/* Line Stroke */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />
              )}

              {/* Interaction Nodes */}
              {trendPoints.map((pt, idx) => (
                <g key={idx}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredTrendIdx === idx ? 6 : 4}
                    fill={hoveredTrendIdx === idx ? "#10b981" : "#ffffff"}
                    stroke="#10b981"
                    strokeWidth={hoveredTrendIdx === idx ? 2 : 2}
                    className="transition-all duration-150 cursor-pointer"
                    onMouseEnter={() => setHoveredTrendIdx(idx)}
                    onMouseLeave={() => setHoveredTrendIdx(null)}
                  />
                  {/* Axis Text Label */}
                  {idx % 2 === 0 && (
                    <text
                      x={pt.x}
                      y={trendHeight - 6}
                      fill="#64748b"
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {pt.label}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          )}

          {/* Interactive Tooltip Overlay */}
          {hoveredTrendIdx !== null && trendPoints[hoveredTrendIdx] && (
            <div
              className="absolute bg-slate-900/95 text-white text-[10px] rounded-xl px-3 py-2 border border-slate-800 shadow-xl space-y-0.5 animate-scale-in"
              style={{
                left: `${(trendPoints[hoveredTrendIdx].x / trendWidth) * 90}%`,
                top: `${(trendPoints[hoveredTrendIdx].y / trendHeight) * 60}%`,
              }}
            >
              <div className="font-extrabold text-[9px] text-slate-400 uppercase">
                {trendPoints[hoveredTrendIdx].label}
              </div>
              <div className="font-bold flex items-center gap-1">
                <span>Present Rate:</span>
                <span className="text-emerald-400">{trendPoints[hoveredTrendIdx].rate}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 📊 Chart 2: Team performance comparison */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Persons className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">Team Standings (Avg Points/Member)</h3>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            All-Time Standings
          </span>
        </div>

        <div className="relative w-full h-[180px] mt-2 flex items-center justify-center select-none">
          {teamPointsData.length === 0 ? (
            <div className="text-slate-400 text-xs font-semibold">No team points statistics available yet.</div>
          ) : (
            <svg viewBox={`0 0 ${barWidth} ${barHeight}`} className="w-full h-full">
              <defs>
                <linearGradient id="barPositiveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
                <linearGradient id="barNegativeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f87171" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>

              {/* Grid Y Axis Gridlines */}
              {Array.from({ length: 5 }).map((_, idx) => {
                const val = Math.round(yMin + (idx * yRange / 4));
                const y = getBarY(val);
                return (
                  <g key={idx}>
                    <line
                      x1={barPaddingLeft}
                      y1={y}
                      x2={barWidth - barPaddingRight}
                      y2={y}
                      stroke={val === 0 ? "#cbd5e1" : "#f1f5f9"}
                      strokeWidth={val === 0 ? "1.5" : "1"}
                      strokeDasharray={val === 0 ? "0" : "3,3"}
                    />
                    <text
                      x={barPaddingLeft - 6}
                      y={y + 3}
                      fill="#94a3b8"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {teamBars.map((bar, idx) => {
                const isPositive = bar.avg >= 0;
                return (
                  <g key={idx}>
                    {/* Background trigger for hover */}
                    <rect
                      x={bar.x - 10}
                      y={barPaddingTop}
                      width={bar.width + 20}
                      height={bGraphHeight}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredBarIdx(idx)}
                      onMouseLeave={() => setHoveredBarIdx(null)}
                    />
                    {/* The Visual Bar */}
                    <rect
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={bar.height}
                      rx="4"
                      fill={isPositive ? "url(#barPositiveGrad)" : "url(#barNegativeGrad)"}
                      opacity={hoveredBarIdx === idx ? 0.95 : 0.8}
                      className="transition-all duration-200 cursor-pointer"
                      onMouseEnter={() => setHoveredBarIdx(idx)}
                      onMouseLeave={() => setHoveredBarIdx(null)}
                    />
                    {/* Team Code Tag */}
                    <text
                      x={bar.x + bar.width / 2}
                      y={barHeight - 6}
                      fill="#475569"
                      fontSize="8.5"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {bar.code}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Interactive Tooltip Overlay */}
          {hoveredBarIdx !== null && teamBars[hoveredBarIdx] && (
            <div
              className="absolute bg-slate-900/95 text-white text-[10px] rounded-xl px-3 py-2 border border-slate-800 shadow-xl space-y-1 animate-scale-in"
              style={{
                left: `${(teamBars[hoveredBarIdx].x / barWidth) * 90}%`,
                top: `${(teamBars[hoveredBarIdx].y / barHeight) * 55}%`,
              }}
            >
              <div className="font-extrabold text-[9px] text-emerald-400 uppercase tracking-wide">
                {teamBars[hoveredBarIdx].name} ({teamBars[hoveredBarIdx].code})
              </div>
              <div className="space-y-0.5 font-bold">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Members:</span>
                  <span>{teamBars[hoveredBarIdx].members}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Avg Points:</span>
                  <span className={teamBars[hoveredBarIdx].avg >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {teamBars[hoveredBarIdx].avg} pts
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Total Points:</span>
                  <span>{teamBars[hoveredBarIdx].total} pts</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
