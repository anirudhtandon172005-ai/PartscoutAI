import { authHeaders, handleResponse } from './searches';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

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

export interface WorkspaceBootstrap {
  machines: Machine[];
  parts: Part[];
  requests: PartRequest[];
  suppliers: Supplier[];
  offers: SupplierOffer[];
  quotations: Quotation[];
  sourceDomains: SourceDomain[];
  collectionJobs: CollectionJob[];
  qualityIssues: DataQualityIssue[];
  savedPartIds: string[];
}

// Forward declare types for the interface
interface Machine {
  id: string;
  workspaceId: string;
  manufacturer: string;
  model: string;
  machineType: string;
  facility: string;
  productionLine: string;
  commissionYear: number | null;
  criticality: 'High' | 'Medium' | 'Low';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Part {
  id: string;
  workspaceId: string | null;
  partNumber: string;
  manufacturer: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string | null;
  datasheetUrl: string | null;
  specifications: Record<string, unknown>;
  isOriginalTarget?: boolean;
  matchScore: number;
  matchConfidence: 'High' | 'Medium' | 'Low';
  overallStatus: 'Drop-in Replacement' | 'Functional Equivalent' | 'Mounting Review Required' | 'Not Recommended';
  cadAvailable?: boolean;
  keySpecs: Record<string, string>;
  offers: SupplierOffer[];
  evidence: SourceEvidence[];
  uncertaintyNotes: string[];
}

interface PartRequest {
  id: string;
  workspaceId: string;
  machineId: string | null;
  requestNumber: string;
  machineName: string;
  partName: string;
  originalPartNumber: string;
  manufacturer: string;
  quantityNeeded: number;
  urgency: 'Line Down (Critical)' | 'Urgent (24-48h)' | 'Planned Maintenance' | 'Standard Restock';
  acceptableAlternatives: boolean;
  customRequirements: string;
  status: 'Draft' | 'Researching' | 'Candidates Found' | 'Quote Requested' | 'Approved' | 'PO Issued' | 'Installed';
  targetComponentId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  trackingNotes: { timestamp: string; author: string; text: string }[];
}

interface Supplier {
  id: string;
  workspaceId: string | null;
  name: string;
  domain: string;
  type: 'Authorized Distributor' | 'Direct Manufacturer' | 'Surplus/Independent' | 'Specialist Stockist';
  country: string;
  headquarters: string;
  inventoryReliabilityScore: number | null;
  averageFulfillmentDays: number | null;
  activeListingsCount: number;
  verifiedPartner: boolean;
  contactDisclaimer: string;
  directPhone: string | null;
  supportEmail: string | null;
  websiteUrl: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface SupplierOffer {
  id: string;
  workspaceId: string;
  supplierId: string;
  partId: string | null;
  partNumber: string;
  supplierName: string;
  supplierDomain: string;
  supplierType: 'Authorized Distributor' | 'Direct Manufacturer' | 'Surplus/Independent' | 'Specialist Stockist';
  location: string;
  reportedPrice: number;
  currency: string;
  stockStatus: 'In Stock' | 'Limited Stock' | 'Call for Lead Time' | 'Made to Order';
  quantityAvailable: number | null;
  leadTimeDays: number;
  minOrderQuantity: number;
  sourceUrl: string;
  lastChecked: string | null;
  freshness: 'fresh' | 'moderate' | 'stale';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Quotation {
  id: string;
  workspaceId: string;
  partRequestId: string;
  supplierId: string | null;
  partNumber: string;
  supplierName: string;
  unitPrice: number;
  currency: string;
  quantity: number;
  totalPrice: number;
  leadTimeWeeks: number;
  rfqNumber: string;
  quotedAt: string;
  validUntil: string | null;
  terms: string;
  isOfficial: boolean;
  status: 'Pending Review' | 'Accepted' | 'Declined';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface SourceDomain {
  id: string;
  workspaceId: string;
  name: string;
  domain: string;
  category: 'Manufacturer Portal' | 'Major Distributor' | 'Regional Stockist' | 'Engineering Library';
  enabled: boolean;
  crawlFrequency: 'Hourly' | 'Daily' | 'Weekly';
  lastCrawlStatus: 'Success' | 'Rate Limited' | 'Warning' | 'Error';
  lastCrawlTime: string | null;
  extractedProductsCount: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface CollectionJob {
  id: string;
  workspaceId: string;
  jobName: string;
  domain: string;
  status: 'Completed' | 'Running' | 'Failed' | 'Queued';
  recordsExtracted: number;
  durationSeconds: number;
  retries: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

interface DataQualityIssue {
  id: string;
  workspaceId: string;
  issueType: 'Stale Stock Observation' | 'Conflicting Spec Claim' | 'Missing Critical Attribute' | 'Duplicate Part Record';
  severity: 'High' | 'Medium' | 'Low';
  partNumber: string;
  description: string;
  sources: string[];
  detectedAt: string;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

interface SourceEvidence {
  id: string;
  claim: string;
  sourceTitle: string;
  sourceDomain: string;
  sourceUrl: string;
  sourceType: 'Manufacturer Datasheet' | 'Distributor Catalog' | 'CAD Model Spec' | 'Direct Supplier API';
  excerpt: string;
  retrievalTimestamp: string;
  confidence: number;
  verifiedByHuman?: boolean;
}

export async function getWorkspaceBootstrap(): Promise<WorkspaceBootstrap> {
  const response = await fetch(`${API_BASE_URL}/api/v1/workspace/bootstrap`, { headers: await authHeaders() });
  const data = await handleResponse<Record<string, unknown>>(response);
  return camelizeKeys(data) as WorkspaceBootstrap;
}

export async function setSavedPart(partId: string, saved: boolean): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/workspace/saved-parts/${encodeURIComponent(partId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...await authHeaders() },
    body: JSON.stringify({ saved }),
  });
  await handleResponse(response);
}

export async function updateRequestStatus(requestId: string, status: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/workspace/requests/${encodeURIComponent(requestId)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...await authHeaders() },
    body: JSON.stringify({ status }),
  });
  await handleResponse(response);
}

export async function addRequestNote(requestId: string, text: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/workspace/requests/${encodeURIComponent(requestId)}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...await authHeaders() },
    body: JSON.stringify({ text }),
  });
  await handleResponse(response);
}

async function patchWorkspace(path: string, body?: Record<string, unknown>): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/workspace/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...await authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });
  await handleResponse(response);
}

export async function updateQuotationStatus(id: string, status: string): Promise<void> {
  return patchWorkspace(`quotations/${encodeURIComponent(id)}/status`, { status });
}

export async function toggleSourceDomain(id: string, enabled: boolean): Promise<void> {
  return patchWorkspace(`source-domains/${encodeURIComponent(id)}`, { enabled });
}

export async function resolveQualityIssue(id: string): Promise<void> {
  return patchWorkspace(`quality-issues/${encodeURIComponent(id)}/resolve`);
}

async function createWorkspace(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const requestId = `web-${crypto.randomUUID()}`;
  const response = await fetch(`${API_BASE_URL}/api/v1/workspace/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId, ...await authHeaders() },
    body: JSON.stringify(body),
  });
  const data = await handleResponse<Record<string, unknown>>(response);
  return camelizeKeys(data) as Record<string, unknown>;
}

function toSnakeCase(value: string): string {
  return value.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

function snakeCaseKeys(body: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(body).map(([key, value]) => [toSnakeCase(key), value]));
}

export async function createWorkspaceRequest(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return createWorkspace('requests', snakeCaseKeys(body));
}

export async function createWorkspaceQuotation(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return createWorkspace('quotations', body);
}

export async function createWorkspaceSourceDomain(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return createWorkspace('source-domains', body);
}

export async function createWorkspaceMachine(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return createWorkspace('machines', body);
}

export async function updateWorkspaceMachine(id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE_URL}/api/v1/workspace/machines/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...await authHeaders() },
    body: JSON.stringify(body),
  });
  const data = await handleResponse<Record<string, unknown>>(response);
  return camelizeKeys(data) as Record<string, unknown>;
}

export async function deleteWorkspaceMachine(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/workspace/machines/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  return handleResponse(response);
}

export async function createWorkspaceSupplier(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return createWorkspace('suppliers', body);
}

export async function createWorkspaceOffer(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return createWorkspace('offers', body);
}
