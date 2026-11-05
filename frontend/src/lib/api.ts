import { ModerationRecord, HistoryResponse, ApiHealth } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'API request failed';
    try {
      const errorJson = await res.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      errorDetail = await res.text() || res.statusText || errorDetail;
    }
    throw new ApiError(errorDetail, res.status);
  }
  return res.json();
}

export async function getHealthStatus(): Promise<ApiHealth> {
  const res = await fetch(`${API_BASE_URL}/health`, {
    cache: 'no-store',
  });
  return handleResponse<ApiHealth>(res);
}

export async function moderateTextContent(text: string): Promise<ModerationRecord> {
  const res = await fetch(`${API_BASE_URL}/api/moderate/text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });
  return handleResponse<ModerationRecord>(res);
}

export async function moderateImageContent(file: File): Promise<ModerationRecord> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/api/moderate/image`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<ModerationRecord>(res);
}

export async function getModerationHistory(
  statusFilter?: string,
  contentTypeFilter?: string,
  limit: number = 50
): Promise<HistoryResponse> {
  const params = new URLSearchParams();
  if (statusFilter && statusFilter !== 'ALL') {
    params.append('status', statusFilter);
  }
  if (contentTypeFilter && contentTypeFilter !== 'ALL') {
    params.append('content_type', contentTypeFilter);
  }
  params.append('limit', limit.toString());

  const url = `${API_BASE_URL}/api/moderation/history?${params.toString()}`;
  const res = await fetch(url, {
    cache: 'no-store',
  });
  return handleResponse<HistoryResponse>(res);
}

export async function updateModeratorDecision(
  recordId: number,
  decision: 'approved' | 'rejected'
): Promise<ModerationRecord> {
  const res = await fetch(`${API_BASE_URL}/api/moderation/${recordId}/decision`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ decision }),
  });
  return handleResponse<ModerationRecord>(res);
}

