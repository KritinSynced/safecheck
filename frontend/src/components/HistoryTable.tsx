'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Ban,
  Check,
  X,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';
import { ModerationRecord, ModerationStatus } from '../types';
import { updateModeratorDecision } from '../lib/api';

interface HistoryTableProps {
  records: ModerationRecord[];
  isLoading: boolean;
  onRefresh: () => void;
  onRecordUpdated: (updated: ModerationRecord) => void;
  onSelectRecord?: (record: ModerationRecord) => void;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({
  records,
  isLoading,
  onRefresh,
  onRecordUpdated,
  onSelectRecord,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [processingId, setProcessingId] = useState<number | null>(null);

  const handleDecision = async (id: number, decision: 'approved' | 'rejected') => {
    try {
      setProcessingId(id);
      const updated = await updateModeratorDecision(id, decision);
      onRecordUpdated(updated);
    } catch (err: any) {
      alert(`Failed to update decision: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status.toUpperCase() === statusFilter;
  });

  const getStatusBadge = (status: ModerationStatus) => {
    switch (status) {
      case 'Safe':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Safe</span>
          </span>
        );
      case 'Flagged':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Flagged</span>
          </span>
        );
      case 'Blocked':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Ban className="w-3 h-3 text-rose-600" />
            <span>Blocked</span>
          </span>
        );
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Header and Controls */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <h3 className="text-base font-bold text-slate-900">Moderation Audit History</h3>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono border border-slate-200">
            {filteredRecords.length} records
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Status Filter Buttons */}
          <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200 text-xs font-medium">
            {['ALL', 'FLAGGED', 'BLOCKED', 'SAFE'].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  statusFilter === filter
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {filter === 'ALL' ? 'All' : filter.charAt(0) + filter.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
            title="Refresh history"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Content</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Risk Score</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4 text-right">Moderator Decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  {isLoading ? 'Loading records...' : 'No moderation records found.'}
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  onClick={() => onSelectRecord && onSelectRecord(record)}
                >
                  {/* Content Preview */}
                  <td className="py-3 px-4 max-w-xs sm:max-w-md">
                    {record.content_type === 'text' ? (
                      <p className="line-clamp-2 text-slate-900 font-medium">
                        {record.content}
                      </p>
                    ) : (
                      <div className="flex items-center space-x-2">
                        {record.preview_url ? (
                          <div className="w-8 h-8 rounded bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-300">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={record.preview_url}
                              alt="Thumbnail"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : null}
                        <span className="truncate text-slate-800 font-mono text-[11px]">
                          {record.content}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Content Type */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center space-x-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {record.content_type === 'text' ? (
                        <FileText className="w-3 h-3 text-slate-500" />
                      ) : (
                        <ImageIcon className="w-3 h-3 text-slate-500" />
                      )}
                      <span className="capitalize">{record.content_type}</span>
                    </span>
                  </td>

                  {/* Risk Score */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-slate-900">
                        {record.risk_score}
                      </span>
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className={`h-full ${
                            record.risk_score < 30
                              ? 'bg-emerald-500'
                              : record.risk_score < 70
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${record.risk_score}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getStatusBadge(record.status)}
                  </td>

                  {/* Date */}
                  <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                    {formatDate(record.created_at)}
                  </td>

                  {/* Moderator Decision / Actions */}
                  <td className="py-3 px-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                    {record.moderator_decision ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded font-semibold text-xs ${
                          record.moderator_decision === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {record.moderator_decision === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                    ) : (
                      <div className="inline-flex items-center space-x-1.5 justify-end">
                        <button
                          type="button"
                          disabled={processingId === record.id}
                          onClick={() => handleDecision(record.id, 'approved')}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded font-semibold text-xs transition-colors cursor-pointer"
                          title="Approve content"
                        >
                          <Check className="w-3 h-3 inline mr-0.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={processingId === record.id}
                          onClick={() => handleDecision(record.id, 'rejected')}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded font-semibold text-xs transition-colors cursor-pointer"
                          title="Reject content"
                        >
                          <X className="w-3 h-3 inline mr-0.5" />
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

