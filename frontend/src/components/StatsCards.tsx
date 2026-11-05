'use client';

import React from 'react';
import { ShieldCheck, AlertTriangle, Ban, Layers, UserCheck } from 'lucide-react';
import { HistoryStats } from '../types';

interface StatsCardsProps {
  stats: HistoryStats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {/* Total Analyzed */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm col-span-2 md:col-span-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Content</p>
          <Layers className="w-4 h-4 text-slate-400" />
        </div>
        <p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p>
        <p className="mt-1 text-xs text-slate-500">Processed items</p>
      </div>

      {/* Safe Content */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Safe</p>
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
        </div>
        <p className="mt-2 text-2xl font-bold text-emerald-700">{stats.safe_count}</p>
        <p className="mt-1 text-xs text-emerald-600 font-medium">Risk &lt; 30</p>
      </div>

      {/* Flagged Content */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Flagged</p>
          <AlertTriangle className="w-4 h-4 text-amber-500" />
        </div>
        <p className="mt-2 text-2xl font-bold text-amber-700">{stats.flagged_count}</p>
        <p className="mt-1 text-xs text-amber-600 font-medium">Risk 30 - 69</p>
      </div>

      {/* Blocked Content */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Blocked</p>
          <Ban className="w-4 h-4 text-rose-500" />
        </div>
        <p className="mt-2 text-2xl font-bold text-rose-700">{stats.blocked_count}</p>
        <p className="mt-1 text-xs text-rose-600 font-medium">Risk &ge; 70</p>
      </div>

      {/* Human Review Decisions */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm col-span-2 md:col-span-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Human Decisions</p>
          <UserCheck className="w-4 h-4 text-slate-600" />
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-xl font-bold text-emerald-700">{stats.approved_count}</span>
          <span className="text-xs text-slate-400">appr.</span>
          <span className="text-slate-300">/</span>
          <span className="text-xl font-bold text-rose-700">{stats.rejected_count}</span>
          <span className="text-xs text-slate-400">rej.</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">Moderator actions</p>
      </div>
    </div>
  );
};

