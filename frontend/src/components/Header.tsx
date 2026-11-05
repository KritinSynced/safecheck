'use client';

import React from 'react';
import { ShieldCheck, Cloud, Server, AlertCircle } from 'lucide-react';
import { ApiHealth } from '../types';

interface HeaderProps {
  health: ApiHealth | null;
  isLoadingHealth: boolean;
  onRefreshHealth: () => void;
}

export const Header: React.FC<HeaderProps> = ({ health, isLoadingHealth, onRefreshHealth }) => {
  const isConnected = !!health && health.status === 'ok';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-md bg-slate-900 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-slate-900 tracking-tight">SafeCheck</span>
                <span className="text-xs bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded border border-slate-200">
                  Trust &amp; Safety
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Automated Content Moderation Engine
              </p>
            </div>
          </div>

          {/* Right Status Indicators */}
          <div className="flex items-center space-x-4">
            {/* Backend Connectivity Badge */}
            <div 
              onClick={onRefreshHealth}
              className="cursor-pointer flex items-center space-x-2 text-xs py-1.5 px-3 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
              title="Click to re-check API status"
            >
              <div className="flex items-center space-x-1.5">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                <Server className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-medium text-slate-700">
                  {isLoadingHealth ? 'Checking...' : isConnected ? 'API Online' : 'API Offline'}
                </span>
              </div>

              {health && (
                <div className="flex items-center space-x-1 border-l border-slate-200 pl-2 text-slate-500">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>{health.aws_configured ? 'AWS Live' : 'AWS Sim'}</span>
                </div>
              )}
            </div>

            {/* Quick Badge / Info */}
            <div className="hidden md:flex items-center space-x-1 text-xs text-slate-500">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Human Review Required for High-Risk</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

