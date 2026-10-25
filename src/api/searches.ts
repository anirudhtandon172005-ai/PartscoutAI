const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

import { supabase } from '../lib/supabase';

export type SearchStage =
  | 'source_discovery'
  | 'page_retrieval'
  | 'attribute_extraction'
  | 'normalization'
  | 'validation'
  | 'evidence_compilation';

export interface SearchRequirementInput {
  mounting?: string;
  output?: string;
  sensing_range_mm?: number;
  connector?: string;
  operating_voltage?: string;
  switching_frequency?: string;
}

export interface SearchCreateRequest {
  machine_name: string;
  part_name: string;
  original_part_number: string;
  manufacturer?: string;
  quantity: number;
  requirements: SearchRequirementInput;
}

export interface SearchCreateResponse {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  stage: SearchStage | null;
  progressPercent: number;
  stageMessage: string;
  createdAt: string;
  completedAt: string | null;
  candidateCount: number;
}

export interface SearchStatusResponse {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  stage: SearchStage | null;
  progressPercent: number;
  stageMessage: string;
  request: {
    machineName: string;
    partName: string;
    originalPartNumber: string;
    manufacturer?: string | null;
    quantity: number;
    requirements: RequirementSpec;
  };
  candidateCount: number;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
}

export interface CandidateEvidence {
  field: string;
  quote: string;
  sourceUrl: string;
  confidence: number;
  retrievedAt: string | null;
}

export interface CandidateResponse {
  id: string;
  partNumber: string;
  manufacturer: string;
  compatibility: 'compatible' | 'partial' | 'incompatible' | 'unknown';
  score: number;
  specifications: Record<string, unknown>;
  evidence: CandidateEvidence[];
  offers?: CandidateOffer[];
}

export interface CandidateOffer {
  supplierName: string;
  supplierId: string | null;
  supplierDomain: string;
  supplierType: string;
  location: string;
  reportedPrice: number | null;
  currency: string | null;
  stockStatus: string | null;
  quantityAvailable: number | null;
  leadTimeDays: number | null;
  minOrderQuantity: number | null;
  sourceUrl: string;
  productUrl: string | null;
  datasheetUrl: string | null;
  lastChecked: string;
  freshness: 'fresh' | 'moderate' | 'stale';
  contactPhone: string | null;
  contactEmail: string | null;
  evidenceQuote: string | null;
  confidence: number | null;
  notes: string | null;
}

export interface CandidateListResponse {
  searchId: string;
  items: CandidateResponse[];
}

export interface RequirementSpec {
  mounting?: string;
  output?: string;
  sensingRangeMm?: number;
  connector?: string;
  operatingVoltage?: string;
  switchingFrequency?: string;
}

export interface ApiError {
  detail: string;
  requestId?: string;
  status?: number;
}

export class ApiRequestError extends Error {
  readonly requestId: string | null;
  readonly status: number;

  constructor(message: string, status: number, requestId: string | null) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.requestId = requestId;
  }
}

export interface HealthDetails {
  databaseProvider: string;
  databaseHost: string | null;
  databasePath: string | null;
  databaseConnected: boolean;
  databaseError: string | null;
  schemaReady: boolean;
  schemaError: string | null;
  searchProvider: string;
  llmProvider: string;
  tinyfishConfigured: boolean;
  nvidiaConfigured: boolean;
  tinyfishEndpoint: string | null;
  nvidiaEndpoint: string | null;
  configurationWarnings: string[];
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
    const requestId = response.headers.get('X-Request-ID');
    throw new ApiRequestError(
      error.detail || `Request failed with status ${response.status}`,
      response.status,
      requestId,
    );
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
  const requestId = `web-${crypto.randomUUID()}`;
  const response = await fetch(`${API_BASE_URL}/api/v1/searches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId, ...await authHeaders() },
    body: JSON.stringify(input),
    signal,
  });
  const data = await handleResponse<Record<string, unknown>>(response);
  return {
    id: String(data.id),
    status: data.status as SearchCreateResponse['status'],
    stage: (data.stage as SearchStage | null) || null,
    progressPercent: Number(data.progressPercent ?? 0),
    stageMessage: String(data.stageMessage ?? ''),
    createdAt: String(data.createdAt ?? ''),
    completedAt: (data.completedAt as string | null) ?? null,
    candidateCount: Number(data.candidateCount ?? 0),
  };
}

export async function getSearch(searchId: string, signal?: AbortSignal): Promise<SearchStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/searches/${searchId}`, { signal, headers: await authHeaders() });
  const data = await handleResponse<Record<string, any>>(response);
  const rawRequest = data.request || {};
  const rawRequirements = rawRequest.requirements || {};
  return {
    id: String(data.id),
    status: data.status as SearchStatusResponse['status'],
    stage: (data.stage as SearchStage | null) || null,
    progressPercent: Number(data.progressPercent ?? 0),
    stageMessage: String(data.stageMessage ?? ''),
    request: {
      machineName: String(rawRequest.machineName ?? ''),
      partName: String(rawRequest.partName ?? ''),
      originalPartNumber: String(rawRequest.originalPartNumber ?? ''),
      manufacturer: rawRequest.manufacturer ?? null,
      quantity: Number(rawRequest.quantity ?? 0),
      requirements: {
        mounting: rawRequirements.mounting,
        output: rawRequirements.output,
        sensingRangeMm: rawRequirements.sensingRangeMm,
        connector: rawRequirements.connector,
        operatingVoltage: rawRequirements.operatingVoltage,
        switchingFrequency: rawRequirements.switchingFrequency,
      },
    },
    candidateCount: Number(data.candidateCount ?? 0),
    createdAt: String(data.createdAt ?? ''),
    completedAt: (data.completedAt as string | null) ?? null,
    error: (data.error as string | null) ?? null,
  };
}

export async function getCandidates(searchId: string, signal?: AbortSignal): Promise<CandidateListResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/searches/${searchId}/candidates`, { signal, headers: await authHeaders() });
  const data = await handleResponse<Record<string, any>>(response);
  const items = Array.isArray(data.items) ? data.items : [];
  return {
    searchId: String(data.searchId ?? searchId),
    items: items.map((item) => ({
      id: String(item.id),
      partNumber: String(item.partNumber ?? ''),
      manufacturer: String(item.manufacturer ?? ''),
      compatibility: item.compatibility as CandidateResponse['compatibility'],
      score: Number(item.score ?? 0),
      specifications: (item.specifications || {}) as Record<string, unknown>,
      evidence: Array.isArray(item.evidence) ? item.evidence.map((e: Record<string, unknown>) => ({
        field: String(e.field ?? ''),
        quote: String(e.quote ?? ''),
        sourceUrl: String(e.sourceUrl ?? ''),
        confidence: Number(e.confidence ?? 0),
        retrievedAt: (e.retrievedAt as string | null) ?? null,
      })) : [],
      offers: Array.isArray(item.offers) ? item.offers.map((offer: Record<string, unknown>) => ({
        supplierName: String(offer.supplierName || ''),
        supplierId: (offer.supplierId as string | null) ?? null,
        supplierDomain: String(offer.supplierDomain || ''),
        supplierType: String(offer.supplierType || 'Specialist Stockist'),
        location: String(offer.location || ''),
        reportedPrice: typeof offer.reportedPrice === 'number' ? offer.reportedPrice : null,
        currency: (offer.currency as string | null) ?? null,
        stockStatus: (offer.stockStatus as string | null) ?? null,
        quantityAvailable: typeof offer.quantityAvailable === 'number' ? offer.quantityAvailable : null,
        leadTimeDays: typeof offer.leadTimeDays === 'number' ? offer.leadTimeDays : null,
        minOrderQuantity: typeof offer.minOrderQuantity === 'number' ? offer.minOrderQuantity : null,
        sourceUrl: String(offer.sourceUrl || ''),
        productUrl: (offer.productUrl as string | null) ?? null,
        datasheetUrl: (offer.datasheetUrl as string | null) ?? null,
        lastChecked: String(offer.lastChecked || ''),
        freshness: offer.freshness === 'fresh' || offer.freshness === 'moderate' ? offer.freshness : 'stale',
        contactPhone: (offer.contactPhone as string | null) ?? null,
        contactEmail: (offer.contactEmail as string | null) ?? null,
        evidenceQuote: (offer.evidenceQuote as string | null) ?? null,
        confidence: typeof offer.confidence === 'number' ? offer.confidence : null,
        notes: (offer.notes as string | null) ?? null,
      })) : [],
    })),
  };
}

export async function getMe(): Promise<MeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/me`, { headers: await authHeaders() });
  return handleResponse<MeResponse>(response);
}

export async function getHealthDetails(): Promise<HealthDetails> {
  const response = await fetch(`${API_BASE_URL}/health/details`, { headers: await authHeaders() });
  return handleResponse<HealthDetails>(response);
}
