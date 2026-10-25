import { CandidateOffer, CandidateResponse, RequirementSpec } from './searches';
import { ComponentItem, TechnicalSpecification, SourceEvidence, SupplierOffer } from '../types';

const NEEDS_VERIFICATION = 'Needs verification';
const LABELS: Record<string, { name: string; category: TechnicalSpecification['category']; critical: boolean }> = {
  mounting: { name: 'Installation Type', category: 'Mechanical', critical: true },
  output: { name: 'Electrical Output', category: 'Electrical', critical: true },
  sensingRangeMm: { name: 'Sensing Distance (Sn)', category: 'Sensing', critical: true },
  connector: { name: 'Connector Type', category: 'Electrical', critical: true },
  operatingVoltage: { name: 'Operating Voltage Range', category: 'Electrical', critical: true },
  switchingFrequency: { name: 'Switching Frequency', category: 'Electrical', critical: false },
  housingMaterial: { name: 'Housing Material', category: 'Mechanical', critical: false },
  ingressProtection: { name: 'Ingress Protection', category: 'Environmental', critical: true },
};

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return NEEDS_VERIFICATION;
  return String(value);
}

function mapOffers(candidate: CandidateResponse): SupplierOffer[] {
  return (candidate.offers || []).flatMap((offer: CandidateOffer, index) => {
    // The procurement UI performs arithmetic and status rendering. Do not
    // turn missing source values into fake zero-price or zero-day offers.
    if (
      typeof offer.reportedPrice !== 'number' ||
      !offer.currency ||
      !offer.stockStatus ||
      typeof offer.leadTimeDays !== 'number' ||
      typeof offer.minOrderQuantity !== 'number' ||
      !offer.sourceUrl
    ) return [];
    return [{
      id: `${candidate.id}-offer-${index}`,
      workspaceId: 'search-result',
      supplierId: offer.supplierId || `${candidate.id}-supplier-${index}`,
      partId: null,
      partNumber: candidate.partNumber,
      supplierName: offer.supplierName,
      supplierDomain: offer.supplierDomain,
      supplierType: (['Authorized Distributor', 'Direct Manufacturer', 'Surplus/Independent', 'Specialist Stockist'].includes(offer.supplierType) ? offer.supplierType : 'Specialist Stockist') as SupplierOffer['supplierType'],
      location: offer.location,
      reportedPrice: offer.reportedPrice,
      currency: offer.currency,
      stockStatus: (['In Stock', 'Limited Stock', 'Call for Lead Time', 'Made to Order'].includes(offer.stockStatus) ? offer.stockStatus : 'Call for Lead Time') as SupplierOffer['stockStatus'],
      quantityAvailable: offer.quantityAvailable,
      leadTimeDays: offer.leadTimeDays,
      minOrderQuantity: offer.minOrderQuantity,
      sourceUrl: offer.sourceUrl,
      lastChecked: offer.lastChecked || null,
      freshness: offer.freshness,
      notes: offer.notes,
      contactPhone: offer.contactPhone,
      contactEmail: offer.contactEmail,
      createdAt: offer.lastChecked || new Date().toISOString(),
      updatedAt: offer.lastChecked || new Date().toISOString(),
    }];
  });
}

export function mapCandidateToUI(candidate: CandidateResponse, requirements?: RequirementSpec): ComponentItem {
  const compatibilityMap: Record<string, ComponentItem['overallStatus']> = { compatible: 'Drop-in Replacement', partial: 'Mounting Review Required', incompatible: 'Not Recommended', unknown: 'Functional Equivalent' };
  const confidenceMap: Record<string, ComponentItem['matchConfidence']> = { compatible: 'High', partial: 'Medium', incompatible: 'Low', unknown: 'Medium' };
  const evidence: (SourceEvidence & { field?: string })[] = candidate.evidence.map((e, idx) => {
    const sourceUrl = e.sourceUrl;
    let sourceTitle = sourceUrl;
    let sourceDomain = sourceUrl;
    try {
      const url = new URL(sourceUrl);
      sourceTitle = url.hostname.replace('www.', '');
      sourceDomain = url.hostname;
    } catch {
      sourceTitle = 'Invalid source URL';
    }
    return { id: `ev-${candidate.id}-${idx}`, claim: e.quote, sourceTitle, sourceDomain, sourceUrl, sourceType: 'Manufacturer Datasheet' as const, excerpt: e.quote, retrievalTimestamp: e.retrievedAt || NEEDS_VERIFICATION, confidence: Math.round(e.confidence * 100), verifiedByHuman: Boolean(e.retrievedAt && e.confidence >= 0 && e.confidence <= 1), field: e.field };
  });
  const specs = candidate.specifications as Record<string, unknown>;
  const keySpecs: Record<string, string> = {};
  Object.entries(specs).forEach(([key, value]) => {
    const critical = LABELS[key]?.critical || false;
    const hasEvidence = evidence.some((item) => item.field === key);
    keySpecs[LABELS[key]?.name || key.replaceAll('_', ' ')] = critical && !hasEvidence ? NEEDS_VERIFICATION : displayValue(value);
  });
  const requestedKeys = Object.keys(requirements || {}).filter((key) => (requirements as Record<string, unknown>)[key] !== undefined);
  const allKeys = [...new Set([...requestedKeys, ...Object.keys(specs)])];
  const specifications: TechnicalSpecification[] = allKeys.flatMap((key) => {
    const metadata = LABELS[key] || { name: key.replaceAll('_', ' '), category: 'Mechanical' as const, critical: false };
    const hasRawValue = specs[key] !== undefined && specs[key] !== null && specs[key] !== '';
    const critical = metadata.critical || requestedKeys.includes(key);
    const fieldEvidence = evidence.find((item) => item.field === key);
    const hasValue = hasRawValue && (!critical || Boolean(fieldEvidence));
    if (!hasRawValue && !critical) return [];
    const result: TechnicalSpecification['result'] = !hasValue ? 'unknown' : candidate.compatibility === 'incompatible' ? 'mismatch' : candidate.compatibility === 'compatible' ? 'match' : 'review';
    return [{ name: metadata.name, category: metadata.category, originalValue: requirements && key in requirements ? displayValue((requirements as Record<string, unknown>)[key]) : NEEDS_VERIFICATION, candidateValue: hasValue ? displayValue(specs[key]) : NEEDS_VERIFICATION, result, critical, explanation: !hasValue ? NEEDS_VERIFICATION : 'Value supplied by the backend candidate contract; review the linked evidence before installation.', evidenceId: fieldEvidence?.id }];
  });
  const uncertaintyNotes = candidate.evidence.length === 0 ? ['No valid evidence was returned. Critical specifications require manual verification.'] : specifications.some((item) => item.candidateValue === NEEDS_VERIFICATION) ? ['Some critical specifications are missing from the backend response and need verification.'] : [];
  const mount = specs.mounting ? ` ${displayValue(specs.mounting)} mount` : '';
  const output = specs.output ? ` with ${displayValue(specs.output)} output` : '';
  const offers = mapOffers(candidate);
  return { id: candidate.id, workspaceId: null, partNumber: candidate.partNumber, manufacturer: candidate.manufacturer, name: `${candidate.manufacturer} ${candidate.partNumber}`, category: 'Industrial replacement component', description: `${candidate.manufacturer} ${candidate.partNumber}${mount}${output}.`, imageUrl: null, datasheetUrl: candidate.evidence[0]?.sourceUrl || null, matchScore: candidate.score, matchConfidence: confidenceMap[candidate.compatibility] || 'Medium', overallStatus: compatibilityMap[candidate.compatibility] || 'Functional Equivalent', cadAvailable: false, keySpecs, specifications, offers, evidence, uncertaintyNotes };
}

export function mapCandidateToUIDetailed(candidate: CandidateResponse, requirements?: RequirementSpec): ComponentItem { return mapCandidateToUI(candidate, requirements); }
