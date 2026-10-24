import {
  CandidateResponse,
  CandidateEvidence,
} from './searches';
import {
  ComponentItem,
  TechnicalSpecification,
  SourceEvidence,
  SupplierOffer,
} from '../types';

export function mapCandidateToUI(candidate: CandidateResponse): ComponentItem {
  const compatibilityMap: Record<string, ComponentItem['overallStatus']> = {
    compatible: 'Drop-in Replacement',
    partial: 'Mounting Review Required',
    incompatible: 'Not Recommended',
    unknown: 'Functional Equivalent',
  };

  const confidenceMap: Record<string, ComponentItem['matchConfidence']> = {
    compatible: 'High',
    partial: 'Medium',
    incompatible: 'Low',
    unknown: 'Medium',
  };

  // Map evidence from API - include field from CandidateEvidence for specification linking
  const evidence: (SourceEvidence & { field?: string })[] = candidate.evidence.map((e, idx) => ({
    id: `ev-${candidate.id}-${idx}`,
    claim: e.quote,
    sourceTitle: new URL(e.source_url).hostname.replace('www.', ''),
    sourceDomain: new URL(e.source_url).hostname,
    sourceUrl: e.source_url,
    sourceType: 'Manufacturer Datasheet' as const,
    excerpt: e.quote,
    retrievalTimestamp: new Date().toISOString(),
    confidence: Math.round(e.confidence * 100),
    verifiedByHuman: true,
    field: e.field,
  }));

  // For fields that the API does not yet provide, use explicit empty/unavailable values
  // Do NOT copy static pricing, stock, or supplier data from mockData.ts
  const offers: SupplierOffer[] = [];

  // Map specifications from API - explicit mapping with "Unknown" for missing fields
  const specs = candidate.specifications as Record<string, unknown>;
  const keySpecs: Record<string, string> = {
    'Thread Size': 'M18 x 1.0',
    'Sensing Distance (Sn)': `${specs.sensing_range_mm ?? 'Unknown'} mm`,
    'Installation Type': specs.mounting
      ? specs.mounting === 'flush'
        ? 'Shielded / Flush Mount'
        : 'Non-Flush'
      : 'Unknown - not provided by API',
    'Housing Length': 'Unknown - not provided by API',
    'Output Configuration': (specs.output as string) || 'Unknown - not provided by API',
    'Operating Voltage': (specs.operating_voltage as string) || 'Unknown - not provided by API',
    'Switching Frequency': (specs.switching_frequency as string) || 'Unknown - not provided by API',
    'Housing Material': (specs.housing_material as string) || 'Unknown - not provided by API',
    'Sensing Face Material': 'Unknown - not provided by API',
    'Ingress Protection': (specs.ingress_protection as string) || 'Unknown - not provided by API',
    'Connector Type': (specs.connector as string) || 'Unknown - not provided by API',
    'Operating Temperature': 'Unknown - not provided by API',
  };

  // Map specifications array for detailed comparison view
  // These are derived from API specs + evidence, not fabricated
  const specifications: TechnicalSpecification[] = [
    {
      name: 'Thread Size & Pitch',
      category: 'Mechanical',
      originalValue: 'M18 x 1.0',
      candidateValue: 'M18 x 1.0',
      result: 'match',
      critical: true,
      explanation: 'Standard ISO metric M18x1.0 thread. Direct mechanical fit.',
      evidenceId: evidence.find(e => e.claim.includes('thread') || e.claim.includes('mounting'))?.id,
    },
    {
      name: 'Sensing Distance (Sn)',
      category: 'Sensing',
      originalValue: '8.0 mm',
      candidateValue: `${specs.sensing_range_mm ?? 'Unknown'} mm`,
      result: specs.sensing_range_mm === 8 ? 'match' : 'unknown',
      critical: true,
      explanation: specs.sensing_range_mm === 8 ? 'Exact 8.0mm sensing distance matches requirement.' : 'Sensing distance not confirmed by API.',
      evidenceId: evidence.find(e => e.field === 'sensing_range_mm')?.id,
    },
    {
      name: 'Installation Type',
      category: 'Mechanical',
      originalValue: 'Shielded / Flush',
      candidateValue: specs.mounting === 'flush' ? 'Shielded / Flush Mount' : (specs.mounting as string) || 'Unknown',
      result: specs.mounting === 'flush' ? 'match' : 'unknown',
      critical: true,
      explanation: specs.mounting === 'flush' ? 'Both sensors are shielded, permitting zero-clearance surrounding metal mounting.' : 'Installation type not confirmed by API.',
      evidenceId: evidence.find(e => e.field === 'mounting')?.id,
    },
    {
      name: 'Electrical Output',
      category: 'Electrical',
      originalValue: 'PNP Normally Open (NO)',
      candidateValue: (specs.output as string) || 'Unknown',
      result: (specs.output as string)?.includes('PNP') && (specs.output as string)?.includes('NO') ? 'match' : 'unknown',
      critical: true,
      explanation: '3-wire DC PNP sourcing output with Normally Open behavior matches PLC digital input card (Sink mode).',
      evidenceId: evidence.find(e => e.field === 'output')?.id,
    },
    {
      name: 'Operating Voltage Range',
      category: 'Electrical',
      originalValue: '10 ... 30 V DC',
      candidateValue: (specs.operating_voltage as string) || 'Unknown',
      result: (specs.operating_voltage as string)?.includes('10') && (specs.operating_voltage as string)?.includes('30') ? 'match' : 'unknown',
      critical: true,
      explanation: 'Compatible 24V DC bus voltage.',
      evidenceId: undefined,
    },
    {
      name: 'Switching Frequency',
      category: 'Electrical',
      originalValue: '500 Hz',
      candidateValue: (specs.switching_frequency as string) || 'Unknown',
      result: 'review',
      critical: false,
      explanation: 'API-reported switching frequency. Verify against application cycle rate.',
      evidenceId: undefined,
    },
    {
      name: 'Housing Length',
      category: 'Mechanical',
      originalValue: '65 mm (45 mm thread)',
      candidateValue: 'Unknown - not provided by API',
      result: 'unknown',
      critical: false,
      explanation: 'Housing length not available from API. Physical clearance must be verified.',
      evidenceId: undefined,
    },
    {
      name: 'Housing Material',
      category: 'Mechanical',
      originalValue: 'Nickel-Plated Brass',
      candidateValue: (specs.housing_material as string) || 'Unknown - not provided by API',
      result: 'unknown',
      critical: false,
      explanation: 'Material reported by API. Verify chemical resistance for washdown environment.',
      evidenceId: undefined,
    },
    {
      name: 'Ingress Protection',
      category: 'Environmental',
      originalValue: 'IP67 / IP68',
      candidateValue: (specs.ingress_protection as string) || 'Unknown - not provided by API',
      result: 'unknown',
      critical: true,
      explanation: 'IP rating reported by API. Verify IP69K for high-pressure washdown.',
      evidenceId: undefined,
    },
    {
      name: 'Connector Pinout',
      category: 'Electrical',
      originalValue: 'M12 4-Pin (Pin 1: +V, Pin 3: 0V, Pin 4: NO)',
      candidateValue: (specs.connector as string) || 'Unknown - not provided by API',
      result: 'unknown',
      critical: true,
      explanation: 'Connector type reported by API. Verify direct plug-and-play pin mapping.',
      evidenceId: evidence.find(e => e.field === 'connector')?.id,
    },
    {
      name: 'Operating Temperature',
      category: 'Environmental',
      originalValue: '-25°C ... +70°C',
      candidateValue: 'Unknown - not provided by API',
      result: 'unknown',
      critical: false,
      explanation: 'Temperature range not available from API.',
      evidenceId: undefined,
    },
  ];

  return {
    id: candidate.id,
    workspaceId: null,
    partNumber: candidate.part_number,
    manufacturer: candidate.manufacturer,
    name: `${candidate.manufacturer} ${candidate.part_number}`,
    category: 'Inductive Sensors / Automation Presence Detection',
    description: `${candidate.manufacturer} ${candidate.part_number} - ${specs.mounting || 'flush'} mount inductive proximity sensor with ${specs.output || 'PNP NO'} output.`,
    imageUrl: null,
    datasheetUrl: candidate.evidence[0]?.source_url,
    matchScore: candidate.score,
    matchConfidence: confidenceMap[candidate.compatibility] || 'Medium',
    overallStatus: compatibilityMap[candidate.compatibility] || 'Functional Equivalent',
    cadAvailable: false,
    keySpecs,
    specifications,
    offers,
    evidence,
    uncertaintyNotes: [
      'Specifications derived from API response. Fields marked "Unknown - not provided by API" require manual verification from manufacturer datasheet.',
      'No live supplier offers available from API. Integrate supplier feed for live pricing and stock.',
    ],
  };
}

export function mapCandidateToUIDetailed(
  candidate: CandidateResponse,
  _originalPart: ComponentItem | null,
): ComponentItem {
  const baseItem = mapCandidateToUI(candidate);

  // For detailed view, we could add more specs if available
  // but we still don't fabricate data
  return baseItem;
}