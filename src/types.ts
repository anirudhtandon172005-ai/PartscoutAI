export type CompatibilityResult = 'match' | 'mismatch' | 'unknown' | 'review';

export interface Machine {
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

export interface TechnicalSpecification {
  name: string;
  category: 'Electrical' | 'Mechanical' | 'Sensing' | 'Environmental' | 'Approvals';
  originalValue: string;
  candidateValue: string;
  unit?: string;
  result: CompatibilityResult;
  critical: boolean;
  explanation: string;
  evidenceId?: string;
}

export interface SourceEvidence {
  id: string;
  claim: string;
  sourceTitle: string;
  sourceDomain: string;
  sourceUrl: string;
  sourceType: 'Manufacturer Datasheet' | 'Distributor Catalog' | 'CAD Model Spec' | 'Direct Supplier API';
  excerpt: string;
  retrievalTimestamp: string;
  confidence: number; // 0 to 100
  verifiedByHuman?: boolean;
}

export interface SupplierOffer {
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
  freshness: 'fresh' | 'moderate' | 'stale'; // fresh < 4h, moderate < 24h, stale > 24h
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentItem {
  id: string;
  workspaceId: string | null;
  partNumber: string;
  manufacturer: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string | null;
  datasheetUrl: string | null;
  specifications: TechnicalSpecification[];
  isOriginalTarget?: boolean;
  matchScore: number; // 0 to 100
  matchConfidence: 'High' | 'Medium' | 'Low';
  overallStatus: 'Drop-in Replacement' | 'Functional Equivalent' | 'Mounting Review Required' | 'Not Recommended';
  cadAvailable?: boolean;
  keySpecs: Record<string, string>;
  offers: SupplierOffer[];
  evidence: SourceEvidence[];
  uncertaintyNotes: string[];
}

export interface PartRequest {
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

export interface Supplier {
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

export interface Quotation {
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

export interface SourceDomain {
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

export interface CollectionJob {
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

export interface DataQualityIssue {
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

export interface WorkspaceSummary {
  id: string;
  name: string;
  facility: string;
  role: string;
}

export interface MeResponse {
  id: string;
  email: string | null;
  fullName: string;
  facility: string;
  workspaces: WorkspaceSummary[];
}

export interface WorkspaceBootstrap {
  machines: Machine[];
  parts: ComponentItem[];
  requests: PartRequest[];
  suppliers: Supplier[];
  offers: SupplierOffer[];
  quotations: Quotation[];
  sourceDomains: SourceDomain[];
  collectionJobs: CollectionJob[];
  qualityIssues: DataQualityIssue[];
  savedPartIds: string[];
}