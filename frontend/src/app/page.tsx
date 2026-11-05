'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { StatsCards } from '../components/StatsCards';
import { SubmissionForm } from '../components/SubmissionForm';
import { ModerationResultsPanel } from '../components/ModerationResultsPanel';
import { HistoryTable } from '../components/HistoryTable';
import { ModerationRecord, HistoryStats, ApiHealth } from '../types';
import { getHealthStatus, getModerationHistory } from '../lib/api';

const defaultStats: HistoryStats = {
  total: 0,
  safe_count: 0,
  flagged_count: 0,
  blocked_count: 0,
  approved_count: 0,
  rejected_count: 0,
};

export default function HomePage() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'history'>('dashboard');
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  const [historyRecords, setHistoryRecords] = useState<ModerationRecord[]>([]);
  const [stats, setStats] = useState<HistoryStats>(defaultStats);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [currentResult, setCurrentResult] = useState<ModerationRecord | null>(null);

  // Check health of backend
  const checkApiHealth = useCallback(async () => {
    try {
      setIsLoadingHealth(true);
      const data = await getHealthStatus();
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setIsLoadingHealth(false);
    }
  }, []);

  // Fetch moderation history & stats
  const fetchHistoryData = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const data = await getModerationHistory();
      setHistoryRecords(data.items);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    checkApiHealth();
    fetchHistoryData();
  }, [checkApiHealth, fetchHistoryData]);

  // Handler when new content is submitted and analyzed
  const handleModerationComplete = (newRecord: ModerationRecord) => {
    setCurrentResult(newRecord);
    // Refresh history and stats immediately
    fetchHistoryData();
  };

  // Handler when a decision is approved/rejected in either the panel or table
  const handleRecordUpdated = (updatedRecord: ModerationRecord) => {
    // If the currently inspected result is the one updated, update it
    if (currentResult && currentResult.id === updatedRecord.id) {
      setCurrentResult(updatedRecord);
    }
    // Update in local records list
    setHistoryRecords((prev) =>
      prev.map((rec) => (rec.id === updatedRecord.id ? updatedRecord : rec))
    );
    // Refresh stats
    fetchHistoryData();
  };

  const pendingReviewCount = stats.flagged_count;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header
        health={health}
        isLoadingHealth={isLoadingHealth}
        onRefreshHealth={checkApiHealth}
      />

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          pendingCount={pendingReviewCount}
        />

        {/* Main Workspace Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
          {/* Top Statistics Cards */}
          <StatsCards stats={stats} />

          {currentView === 'dashboard' ? (
            <div className="space-y-6">
              {/* Submission Form + Active Result Side-by-Side Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <SubmissionForm onModerationComplete={handleModerationComplete} />
                <ModerationResultsPanel
                  result={currentResult}
                  onDecisionUpdated={handleRecordUpdated}
                />
              </div>

              {/* Recent Audit History Preview */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Recent Activity
                  </h3>
                  <button
                    onClick={() => setCurrentView('history')}
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold underline"
                  >
                    View All History &rarr;
                  </button>
                </div>
                <HistoryTable
                  records={historyRecords.slice(0, 10)}
                  isLoading={isLoadingHistory}
                  onRefresh={fetchHistoryData}
                  onRecordUpdated={handleRecordUpdated}
                  onSelectRecord={(rec) => setCurrentResult(rec)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Detailed Moderation History View */}
              {currentResult && (
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Inspecting Selected Record #{currentResult.id}
                  </h3>
                  <ModerationResultsPanel
                    result={currentResult}
                    onDecisionUpdated={handleRecordUpdated}
                  />
                </div>
              )}

              <HistoryTable
                records={historyRecords}
                isLoading={isLoadingHistory}
                onRefresh={fetchHistoryData}
                onRecordUpdated={handleRecordUpdated}
                onSelectRecord={(rec) => {
                  setCurrentResult(rec);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

