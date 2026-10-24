const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface RequirementSpec {
  mounting?: string;
  output?: string;
  sensing_range_mm?: number;
  connector?: string;
}

export interface SearchCreateRequest {
  machine_name: string;
  part_name: string;
  original_part_number: string;
  manufacturer?: string;
  quantity: number;
  requirements: RequirementSpec;
}

export interface SearchCreateResponse {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  created_at: string;
  completed_at: string | null;
  candidate_count: number;
}

export interface SearchStatusResponse {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  request: SearchCreateRequest;
  candidate_count: number;
  created_at: string;
  completed_at: string | null;
  error: string | null;
}

export interface CandidateEvidence {
  field: string;
  quote: string;
  source_url: string;
  confidence: number;
}

export interface CandidateResponse {
  id: string;
  part_number: string;
  manufacturer: string;
  compatibility: 'compatible' | 'partial' | 'incompatible' | 'unknown';
  score: number;
  specifications: Record<string, unknown>;
  evidence: CandidateEvidence[];
}

export interface CandidateListResponse {
  search_id: string;
  items: CandidateResponse[];
}

export interface ApiError {
  detail: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `Request failed with status ${response.status}`);
  }
  return response.json();
}

export async function createSearch(input: SearchCreateRequest): Promise<SearchCreateResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/searches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<SearchCreateResponse>(response);
}

export async function getSearch(searchId: string): Promise<SearchStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/searches/${searchId}`);
  return handleResponse<SearchStatusResponse>(response);
}

export async function getCandidates(searchId: string): Promise<CandidateListResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/searches/${searchId}/candidates`);
  return handleResponse<CandidateListResponse>(response);
}