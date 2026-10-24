export type CompatibilityResult = 'match' | 'mismatch' | 'unknown' | 'review';

export interface Machine {
  id: string;
  manufacturer: string;
  model: string;
  machineType: string;
  facility: string;
  productionLine: string;
  commissionYear: number;
  criticality: 'High' | 'Medium' | 'Low';
  notes?: string;
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
  supplierId: string;
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
  lastChecked: string;
  freshness: 'fresh' | 'moderate' | 'stale'; // fresh < 4h, moderate < 24h, stale > 24h
  notes?: string;
}

export interface ComponentItem {
  id: string;
  partNumber: string;
  manufacturer: string;
  name: string;
  category: string;
  description: string;
  isOriginalTarget?: boolean;
  matchScore: number; // 0 to 100
  matchConfidence: 'High' | 'Medium' | 'Low';
  overallStatus: 'Drop-in Replacement' | 'Functional Equivalent' | 'Mounting Review Required' | 'Not Recommended';
  imageUrl?: string;
  cadAvailable?: boolean;
  datasheetUrl?: string;
  keySpecs: Record<string, string>;
  specifications: TechnicalSpecification[];
  offers: SupplierOffer[];
  evidence: SourceEvidence[];
  uncertaintyNotes: string[];
}

export interface PartRequest {
  id: string;
  requestNumber: string;
  machineId: string;
  machineName: string;
  partName: string;
  originalPartNumber: string;
  manufacturer: string;
  quantityNeeded: number;
  urgency: 'Line Down (Critical)' | 'Urgent (24-48h)' | 'Planned Maintenance' | 'Standard Restock';
  acceptableAlternatives: boolean;
  customRequirements: string;
  createdAt: string;
  status: 'Draft' | 'Researching' | 'Candidates Found' | 'Quote Requested' | 'Approved' | 'PO Issued' | 'Installed';
  trackingNotes: { timestamp: string; author: string; text: string }[];
  targetComponentId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  domain: string;
  type: 'Authorized Distributor' | 'Direct Manufacturer' | 'Surplus/Independent' | 'Specialist Stockist';
  country: string;
  headquarters: string;
  inventoryReliabilityScore: number;
  averageFulfillmentDays: number;
  activeListingsCount: number;
  verifiedPartner: boolean;
  contactDisclaimer: string;
  directPhone?: string;
  supportEmail?: string;
  websiteUrl: string;
  description: string;
}

export interface Quotation {
  id: string;
  rfqNumber: string;
  partRequestId: string;
  partNumber: string;
  supplierName: string;
  unitPrice: number;
  currency: string;
  quantity: number;
  totalPrice: number;
  leadTimeWeeks: number;
  quotedAt: string;
  validUntil: string;
  terms: string;
  isOfficial: boolean;
  status: 'Pending Review' | 'Accepted' | 'Declined';
}

export interface SourceDomain {
  id: string;
  name: string;
  domain: string;
  category: 'Manufacturer Portal' | 'Major Distributor' | 'Regional Stockist' | 'Engineering Library';
  enabled: boolean;
  crawlFrequency: 'Hourly' | 'Daily' | 'Weekly';
  lastCrawlStatus: 'Success' | 'Rate Limited' | 'Warning' | 'Error';
  lastCrawlTime: string;
  extractedProductsCount: number;
  notes: string;
}

export interface CollectionJob {
  id: string;
  jobName: string;
  domain: string;
  status: 'Completed' | 'Running' | 'Failed' | 'Queued';
  recordsExtracted: number;
  durationSeconds: number;
  retries: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface DataQualityIssue {
  id: string;
  type: 'Stale Stock Observation' | 'Conflicting Spec Claim' | 'Missing Critical Attribute' | 'Duplicate Part Record';
  severity: 'High' | 'Medium' | 'Low';
  partNumber: string;
  description: string;
  sources: string[];
  detectedAt: string;
  resolved: boolean;
}
