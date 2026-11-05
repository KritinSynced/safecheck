export type ContentType = 'text' | 'image';
export type ModerationStatus = 'Safe' | 'Flagged' | 'Blocked';
export type ModeratorDecision = 'approved' | 'rejected' | null;

export interface ModerationDetailItem {
  name: string;
  parent_name?: string;
  confidence: number;
}

export interface ModerationDetails {
  matched_keywords?: Record<string, string[]>;
  spam_triggers?: string[];
  moderation_labels?: ModerationDetailItem[];
  original_filename?: string;
  file_size_bytes?: number;
  s3_bucket?: string;
  s3_key?: string;
  simulation_mode?: boolean;
  notice?: string;
  character_count?: number;
  word_count?: number;
  summary?: string;
}

export interface ModerationRecord {
  id: number;
  content_type: ContentType;
  content: string;
  preview_url: string | null;
  risk_score: number;
  status: ModerationStatus;
  confidence_score: number;
  categories: string[];
  details: ModerationDetails;
  moderator_decision: ModeratorDecision;
  created_at: string;
  educational_disclaimer?: string;
}

export interface HistoryStats {
  total: number;
  safe_count: number;
  flagged_count: number;
  blocked_count: number;
  approved_count: number;
  rejected_count: number;
}

export interface HistoryResponse {
  items: ModerationRecord[];
  stats: HistoryStats;
}

export interface ApiHealth {
  status: string;
  app: string;
  version: string;
  aws_configured: boolean;
  mock_mode: boolean;
}

