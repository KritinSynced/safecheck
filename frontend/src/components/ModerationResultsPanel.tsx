'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Ban,
  CheckCircle,
  XCircle,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles
} from 'lucide-react';
import { ModerationRecord, ModerationStatus, ModeratorDecision } from '../types';
import { updateModeratorDecision } from '../lib/api';

interface ModerationResultsPanelProps {
  result: ModerationRecord | null;
  onDecisionUpdated?: (updated: ModerationRecord) => void;
}

export const ModerationResultsPanel: React.FC<ModerationResultsPanelProps> = ({
  result,
  onDecisionUpdated,
}) => {
  const [showFullDetails, setShowFullDetails] = useState(true);
  const [isUpdatingDecision, setIsUpdatingDecision] = useState(false);

  if (!result) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">No Content Analyzed Yet</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Submit text or an image above to view the automated risk score, detected violation categories, and confidence levels.
        </p>
      </div>
    );
  }

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    try {
      setIsUpdatingDecision(true);
      const updated = await updateModeratorDecision(result.id, decision);
      if (onDecisionUpdated) {
        onDecisionUpdated(updated);
      }
    } catch (err: any) {
      alert(`Failed to update decision: ${err.message}`);
    } finally {
      setIsUpdatingDecision(false);
    }
  };

  const getStatusBadge = (status: ModerationStatus) => {
    switch (status) {
      case 'Safe':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Safe (Allowed)</span>
          </span>
        );
      case 'Flagged':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Flagged (Review Required)</span>
          </span>
        );
      case 'Blocked':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Ban className="w-4 h-4 text-rose-600" />
            <span>Blocked (Violations Detected)</span>
          </span>
        );
    }
  };

  const getScoreMeterColor = (score: number) => {
    if (score < 30) return 'bg-emerald-500';
    if (score < 70) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
            Moderation Result &bull; #{result.id}
          </span>
          <div className="flex items-center space-x-3 mt-1">
            <span className="text-lg font-bold text-slate-900">
              Risk Score: {result.risk_score} / 100
            </span>
            {getStatusBadge(result.status)}
          </div>
        </div>

        {/* Human Moderator Decision Status / Actions */}
        <div className="flex items-center space-x-2">
          {result.moderator_decision ? (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium border bg-white">
              <span className="text-slate-500">Moderator:</span>
              <span
                className={`font-semibold capitalize ${
                  result.moderator_decision === 'approved' ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {result.moderator_decision}
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={isUpdatingDecision}
                onClick={() => handleDecision('approved')}
                className="flex items-center space-x-1 px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Approve</span>
              </button>
              <button
                type="button"
                disabled={isUpdatingDecision}
                onClick={() => handleDecision('rejected')}
                className="flex items-center space-x-1 px-3 py-1.5 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {/* Visual Risk Gauge Bar */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-slate-600 font-medium">Risk Score Meter</span>
            <span className="text-slate-500 font-mono">Confidence: {result.confidence_score}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
            <div
              className={`h-full transition-all duration-300 ${getScoreMeterColor(result.risk_score)}`}
              style={{ width: `${Math.max(result.risk_score, 2)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
            <span>0 (Safe)</span>
            <span>30 (Flagged)</span>
            <span>70 (Blocked)</span>
            <span>100</span>
          </div>
        </div>

        {/* Content Preview */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Content Preview ({result.content_type.toUpperCase()})
          </h4>
          {result.content_type === 'text' ? (
            <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap font-sans">
              {result.content}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-md border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
              {result.preview_url ? (
                <div className="w-36 h-36 rounded-md overflow-hidden bg-slate-200 border border-slate-300 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.preview_url}
                    alt="Moderated image preview"
                    className="w-full h-full object-contain bg-slate-900"
                  />
                </div>
              ) : null}
              <div className="text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Content Reference:</p>
                <code className="block p-1 bg-white border border-slate-200 rounded text-[11px] break-all text-slate-700">
                  {result.content}
                </code>
                {result.details?.file_size_bytes && (
                  <p>File size: {(result.details.file_size_bytes / 1024).toFixed(1)} KB</p>
                )}
                {result.preview_url && (
                  <a
                    href={result.preview_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-slate-700 hover:text-slate-900 underline mt-1"
                  >
                    <span>Open full image</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Detected Categories */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Detected Violation Categories
          </h4>
          {result.categories.length === 0 ? (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-md flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>No policy violations detected. Content complies with standard safety guidelines.</span>
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {result.categories.map((category, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300"
                >
                  {category}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Detailed Breakdown Accordion */}
        <div className="border border-slate-200 rounded-md overflow-hidden">
          <button
            type="button"
            onClick={() => setShowFullDetails(!showFullDetails)}
            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
          >
            <span>Detailed Inspection Breakdown</span>
            {showFullDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showFullDetails && (
            <div className="p-3 text-xs bg-white space-y-3">
              {result.details?.summary && (
                <p className="text-slate-600">{result.details.summary}</p>
              )}

              {/* Text Keywords details */}
              {result.details?.matched_keywords && Object.keys(result.details.matched_keywords).length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-semibold text-slate-800">Matched Harmful Terms:</span>
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                    {Object.entries(result.details.matched_keywords).map(([cat, terms]) => (
                      <div key={cat} className="flex items-start space-x-2">
                        <span className="font-medium text-slate-700">{cat}:</span>
                        <span className="text-rose-700 font-mono">{(terms as string[]).join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Spam Triggers */}
              {result.details?.spam_triggers && result.details.spam_triggers.length > 0 && (
                <div className="space-y-1">
                  <span className="font-semibold text-slate-800">Spam Indicators:</span>
                  <ul className="list-disc pl-5 text-amber-800 space-y-0.5">
                    {result.details.spam_triggers.map((trigger, i) => (
                      <li key={i}>{trigger}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Image Rekognition Labels */}
              {result.details?.moderation_labels && result.details.moderation_labels.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-semibold text-slate-800">
                    Amazon Rekognition Moderation Labels ({result.details.moderation_labels.length}):
                  </span>
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-medium">
                        <tr>
                          <th className="p-2">Label</th>
                          <th className="p-2">Parent Category</th>
                          <th className="p-2 text-right">Confidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {result.details.moderation_labels.map((lbl, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2 font-medium text-slate-800">{lbl.name}</td>
                            <td className="p-2 text-slate-500">{lbl.parent_name || '—'}</td>
                            <td className="p-2 text-right font-mono text-slate-700">
                              {lbl.confidence.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.details?.notice && (
                <div className="p-2 bg-blue-50 border border-blue-200 text-blue-800 rounded">
                  {result.details.notice}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Educational Disclaimer */}
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3 flex items-start space-x-2 text-xs text-slate-600">
          <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-800">Educational Notice:</strong> SafeCheck is a demonstration Trust &amp; Safety system. Automated models can produce false positives and false negatives; high-risk or flagged content requires human review before permanent moderation actions.
          </p>
        </div>
      </div>
    </div>
  );
};

