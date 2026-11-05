'use client';

import React from 'react';
import { LayoutDashboard, History, Shield, Info, CheckCircle2, AlertTriangle, Ban } from 'lucide-react';

interface SidebarProps {
  currentView: 'dashboard' | 'history';
  onSelectView: (view: 'dashboard' | 'history') => void;
  pendingCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onSelectView, pendingCount = 0 }) => {
  return (
    <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Navigation
          </p>
          <nav className="space-y-1">
            <button
              onClick={() => onSelectView('dashboard')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                currentView === 'dashboard'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </div>
            </button>

            <button
              onClick={() => onSelectView('history')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                currentView === 'history'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <History className="w-4 h-4" />
                <span>Moderation History</span>
              </div>
              {pendingCount > 0 && (
                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {pendingCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Policy Scoring Rules Card */}
        <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
          <div className="flex items-center space-x-2 text-slate-900 font-semibold text-xs mb-2.5">
            <Shield className="w-3.5 h-3.5 text-slate-600" />
            <span>Moderation Rules</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-1.5 rounded bg-white border border-slate-200">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-medium text-slate-700">Safe</span>
              </div>
              <span className="font-mono text-emerald-700 font-semibold">&lt; 30</span>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded bg-white border border-slate-200">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-medium text-slate-700">Flagged</span>
              </div>
              <span className="font-mono text-amber-700 font-semibold">30 - 69</span>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded bg-white border border-slate-200">
              <div className="flex items-center space-x-2">
                <Ban className="w-3.5 h-3.5 text-rose-600" />
                <span className="font-medium text-slate-700">Blocked</span>
              </div>
              <span className="font-mono text-rose-700 font-semibold">&ge; 70</span>
            </div>
          </div>
        </div>
      </div>

      {/* Educational Notice Footer */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <div className="flex items-start space-x-2 text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-200">
          <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <p className="leading-relaxed">
            SafeCheck is an educational Trust &amp; Safety system. Deterministic rules &amp; AWS Rekognition automate triage, while human moderators retain final authority.
          </p>
        </div>
      </div>
    </aside>
  );
};

