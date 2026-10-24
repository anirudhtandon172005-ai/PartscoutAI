const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

import { supabase } from '../lib/supabase';

export type SearchStage =
  | 'source_discovery'
  | 'page_retrieval'
  | 'attribute_extraction'
  | 'normalization'
  | 'validation'
  | 'evidence_compilation';

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
  stage: SearchStage | null;
  progress_percent: number;
  stage_message: string;
  created_at: string;
  completed_at: string | null;
  candidate_count: number;
}

export interface SearchStatusResponse {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  stage: SearchStage | null;
  progress_percent: number;
  stage_message: string;
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

export interface MeResponse {
  id: string;
  email: string | null;
  full_name: string;
  facility: string;
  workspaces: { id: string; name: string; facility: string; role: string }[];
}

function camelizeKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(camelizeKeys);
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase()),
      camelizeKeys(value),
    ])
  );
}

export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `Request failed with status ${response.status}`);
  }
  const data = await response.json();
  return camelizeKeys(data) as T;
}

export async function authHeaders(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token
    ? { Authorization: `Bearer ${data.session.access_token}` }
    : {};
}

export async function createSearch(input: SearchCreateRequest, signal?: AbortSignal): Promise<SearchCreateResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/searches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...await authHeaders() },
    body: JSON.stringify(input),
    signal,
  });
  return handleResponse<SearchCreateResponse>(response);
}

export async function getSearch(searchId: string, signal?: AbortSignal): Promise<SearchStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/searches/${searchId}`, { signal, headers: await authHeaders() });
  return handleResponse<SearchStatusResponse>(response);
}

export async function getCandidates(searchId: string, signal?: AbortSignal): Promise<CandidateListResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/searches/${searchId}/candidates`, { signal, headers: await authHeaders() });
  return handleResponse<CandidateListResponse>(response);
}

export async function getMe(): Promise<MeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/me`, { headers: await authHeaders() });
  return handleResponse<MeResponse>(response);
}