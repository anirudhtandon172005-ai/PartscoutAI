import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DemoBadge } from '../components/DemoBadge';
import {
  Filter,
  ArrowUpDown,
  Search,
  Scale,
  Bookmark,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Package,
  Layers,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { getCandidates, CandidateResponse, CandidateEvidence } from '../api/searches';

type CompatibilityResult = 'match' | 'mismatch' | 'unknown' | 'review';

interface TechnicalSpecification {
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

interface SupplierOffer {
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
  freshness: 'fresh' | 'moderate' | 'stale';
  notes?: string;
}

interface ComponentItem {
  id: string;
  partNumber: string;
  manufacturer: string;
  name: string;
  category: string;
  description: string;
  isOriginalTarget?: boolean;
  matchScore: number;
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

function mapCandidateToUI(candidate: CandidateResponse): ComponentItem {
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

  // Map evidence
  const evidence: SourceEvidence[] = candidate.evidence.map((e, idx) => ({
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
  }));

  // Generate mock offers based on candidate
  const offers: SupplierOffer[] = [
    {
      id: `off-${candidate.id}-1`,
      supplierId: 'supp-mcmaster',
      supplierName: 'McMaster-Carr',
      supplierDomain: 'mcmaster.com',
      supplierType: 'Authorized Distributor',
      location: 'Elmhurst, IL, USA',
      reportedPrice: 90 + Math.random() * 30,
      currency: 'USD',
      stockStatus: 'In Stock',
      quantityAvailable: Math.floor(Math.random() * 20) + 1,
      leadTimeDays: 1,
      minOrderQuantity: 1,
      sourceUrl: `https://mcmaster.com/search?q=${candidate.part_number}`,
      lastChecked: '30 minutes ago',
      freshness: 'fresh',
    },
    {
      id: `off-${candidate.id}-2`,
      supplierId: 'supp-digikey',
      supplierName: 'DigiKey Electronics',
      supplierDomain: 'digikey.com',
      supplierType: 'Authorized Distributor',
      location: 'Thief River Falls, MN, USA',
      reportedPrice: 85 + Math.random() * 35,
      currency: 'USD',
      stockStatus: 'In Stock',
      quantityAvailable: Math.floor(Math.random() * 15) + 1,
      leadTimeDays: 1,
      minOrderQuantity: 1,
      sourceUrl: `https://digikey.com/search?q=${candidate.part_number}`,
      lastChecked: '1 hour ago',
      freshness: 'fresh',
    },
  ];

  // Map specifications
  const specs = candidate.specifications as Record<string, any>;
  const keySpecs: Record<string, string> = {
    'Thread Size': specs.mounting === 'flush' ? 'M18 x 1.0' : 'M18 x 1.0',
    'Sensing Distance (Sn)': `${specs.sensing_range_mm || 8} mm`,
    'Installation Type': specs.mounting ? (specs.mounting === 'flush' ? 'Shielded / Flush Mount' : 'Non-Flush') : 'Shielded / Flush Mount',
    'Housing Length': '65 mm (Threaded: 45 mm)',
    'Output Configuration': specs.output || 'PNP Normally Open (NO)',
    'Operating Voltage': specs.operating_voltage || '10 ... 30 V DC',
    'Switching Frequency': specs.switching_frequency || '500 Hz',
    'Housing Material': specs.housing_material || 'Nickel-Plated Brass',
    'Sensing Face Material': 'PBT Thermoplastic',
    'Ingress Protection': specs.ingress_protection || 'IP67 / IP68',
    'Connector Type': specs.connector || 'M12x1 Male, 4-Pin',
    'Operating Temperature': '-25°C ... +70°C',
  };

  return {
    id: candidate.id,
    partNumber: candidate.part_number,
    manufacturer: candidate.manufacturer,
    name: `${candidate.manufacturer} ${candidate.part_number}`,
    category: 'Inductive Sensors / Automation Presence Detection',
    description: `${candidate.manufacturer} ${candidate.part_number} - ${candidate.specifications.mounting || 'flush'} mount inductive proximity sensor with ${candidate.specifications.output || 'PNP NO'} output.`,
    matchScore: candidate.score,
    matchConfidence: confidenceMap[candidate.compatibility] || 'Medium',
    overallStatus: compatibilityMap[candidate.compatibility] || 'Functional Equivalent',
    cadAvailable: true,
    datasheetUrl: candidate.evidence[0]?.source_url,
    keySpecs,
    specifications: [],
    offers,
    evidence,
    uncertaintyNotes: [],
  };
}

export const SearchResultsPage: React.FC<{ requestId?: string }> = ({ requestId = 'req-2026-line4-sensor' }) => {
  const {
    navigate,
    requests,
    targetPart,
    toggleSavePart,
    isPartSaved,
    setActiveEvidence,
    addToast,
  } = useApp();

  const currentReq = requests.find((r) => r.id === requestId) || requests[0];
  const [candidates, setCandidates] = useState<ComponentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inStockOnly, setInStockOnly] = useState(false);
  const [minMatchScore, setMinMatchScore] = useState(80);
  const [selectedManufacturer, setSelectedManufacturer] = useState('all');
  const [sortBy, setSortBy] = useState<'match' | 'price' | 'leadTime'>('match');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!requestId) return;

    const fetchCandidates = async () => {
      try {
        setLoading(true);
        const response = await getCandidates(requestId);
        const mappedCandidates = response.items.map(mapCandidateToUI);
        setCandidates(mappedCandidates);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load candidates');
        addToast('Error', 'Failed to load search results', 'warning');
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, [requestId, addToast]);

  // Filter candidates
  const filteredCandidates = candidates.filter((item) => {
    if (item.matchScore < minMatchScore) return false;
    if (selectedManufacturer !== 'all' && item.manufacturer !== selectedManufacturer) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = `${item.partNumber} ${item.manufacturer} ${item.name} ${item.description}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    if (inStockOnly) {
      const hasInStock = item.offers.some((o) => o.stockStatus === 'In Stock');
      if (!hasInStock) return false;
    }
    return true;
  });

  // Sort candidates
  filteredCandidates.sort((a, b) => {
    if (sortBy === 'match') return b.matchScore - a.matchScore;
    if (sortBy === 'price') {
      const minPriceA = Math.min(...a.offers.map((o) => o.reportedPrice));
      const minPriceB = Math.min(...b.offers.map((o) => o.reportedPrice));
      return minPriceA - minPriceB;
    }
    if (sortBy === 'leadTime') {
      const minLeadA = Math.min(...a.offers.map((o) => o.leadTimeDays));
      const minLeadB = Math.min(...b.offers.map((o) => o.leadTimeDays));
      return minLeadA - minLeadB;
    }
    return 0;
  });

  if (loading) {
    return (
      <div className="results-page-root">
        <DemoBadge variant="banner" lastChecked="Loading..." />
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading search results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-page-root">
        <DemoBadge variant="banner" lastChecked="Error" />
        <div className="error-container">
          <AlertTriangle size={48} className="text-red" />
          <h3>Failed to Load Results</h3>
          <p>{error}</p>
          <button className="btn btn-primary mt-4" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="results-page-root">
      {/* Top Banner Notice */}
      <DemoBadge variant="banner" lastChecked="Today 12:45 UTC" />

      {/* Results Header */}
      <div className="results-header-row">
        <div>
          <div className="results-kicker-row">
            <span className="badge-tag live-cad">RESULTS FOR {currentReq.requestNumber}</span>
            <span className="text-muted-xs">Search executed across 14 targeted sources</span>
          </div>
          <h1 className="results-title">
            Candidate Replacements for {currentReq.originalPartNumber}
          </h1>
          <p className="results-sub">
            Target: <strong>{currentReq.partName}</strong> • Facility: {currentReq.machineName}
          </p>
        </div>

        <div className="results-top-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/app/compare/part-ifm-igt205')}
          >
            <Scale size={16} />
            <span>Open Side-by-Side Comparison</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/app/quotes')}
          >
            <span>Manage RFQ Quotations</span>
          </button>
        </div>
      </div>

      {/* Target Original Baseline Bar */}
      <div className="target-baseline-card">
        <div className="baseline-badge-col">
          <span className="baseline-tag">ORIGINAL BASELINE COMPONENT</span>
          <span className="text-muted-xs">OEM Specification</span>
        </div>

        <div className="baseline-info-col">
          <div className="baseline-title-row">
            <h4 className="baseline-name">{targetPart.name}</h4>
            <span className="baseline-part-num tech-font">{targetPart.partNumber}</span>
            <span className="baseline-mfg">{targetPart.manufacturer}</span>
          </div>
          <div className="baseline-specs-row">
            <span className="spec-token">M18 x 1.0 Flush</span>
            <span className="spec-token">Sn = 8.0 mm</span>
            <span className="spec-token">PNP Normally Open</span>
            <span className="spec-token">10-30V DC</span>
            <span className="spec-token">M12 4-Pin</span>
            <span className="spec-token">Nickel-Plated Brass</span>
          </div>
        </div>

        <div className="baseline-status-col">
          <div className="stock-alert-pill text-amber">
            <AlertTriangle size={13} />
            <span>OEM 4-6 Wk Backorder</span>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-xs mt-2"
            onClick={() => navigate(`/app/parts/${targetPart.id}`)}
          >
            <span>View Baseline Sheet</span>
          </button>
        </div>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="results-toolbar">
        <div className="toolbar-search-box">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Filter candidates by part number, manufacturer, or spec..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="toolbar-controls-row">
          <div className="filter-group">
            <label className="filter-label" htmlFor="filter-score">Min Match:</label>
            <select
              id="filter-score"
              className="toolbar-select"
              value={minMatchScore}
              onChange={(e) => setMinMatchScore(Number(e.target.value))}
            >
              <option value={70}>70% and above</option>
              <option value={80}>80% and above (Recommended)</option>
              <option value={90}>90%+ Drop-in Grade Only</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="filter-mfg">Manufacturer:</label>
            <select
              id="filter-mfg"
              className="toolbar-select"
              value={selectedManufacturer}
              onChange={(e) => setSelectedManufacturer(e.target.value)}
            >
              <option value="all">All Manufacturers</option>
              <option value="ifm efector">ifm efector</option>
              <option value="Turck">Turck</option>
              <option value="Pepperl+Fuchs">Pepperl+Fuchs</option>
              <option value="SICK AG">SICK AG</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
              />
              <span>In Stock Only</span>
            </label>
          </div>

          <div className="filter-group ml-auto">
            <label className="filter-label" htmlFor="sort-by">Sort By:</label>
            <select
              id="sort-by"
              className="toolbar-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="match">Highest Match Score</option>
              <option value="price">Lowest Reported Price</option>
              <option value="leadTime">Fastest Delivery Lead Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Candidate Parts List */}
      <div className="candidates-list-container">
        {filteredCandidates.length === 0 ? (
          <div className="empty-results-card">
            <AlertTriangle size={32} className="text-amber" />
            <h3>No candidates match your current filter settings</h3>
            <p>Try lowering the minimum match score or clearing manufacturer filters.</p>
            <button
              type="button"
              className="btn btn-outline btn-sm mt-3"
              onClick={() => {
                setMinMatchScore(70);
                setSelectedManufacturer('all');
                setInStockOnly(false);
                setSearchQuery('');
              }}
            >
              <RotateCcw size={14} />
              <span>Reset All Filters</span>
            </button>
          </div>
        ) : (
          filteredCandidates.map((candidate, index) => {
            const isSaved = isPartSaved(candidate.id);
            const bestOffer = candidate.offers.sort((a, b) => a.reportedPrice - b.reportedPrice)[0];

            return (
              <div key={candidate.id} className="candidate-card">
                {/* Left: Match Score Pillar */}
                <div className="match-score-pillar">
                  <div className={`score-circle ${candidate.matchScore >= 95 ? 'score-high' : candidate.matchScore >= 90 ? 'score-med' : 'score-low'}`}>
                    <span className="score-number tech-font">{candidate.matchScore}%</span>
                    <span className="score-desc">Match</span>
                  </div>
                  <span className={`status-pill mt-2 ${candidate.overallStatus === 'Drop-in Replacement' ? 'status-pill-teal' : 'status-pill-amber'}`}>
                    {candidate.overallStatus}
                  </span>
                </div>

                {/* Center: Component Specs & Details */}
                <div className="candidate-details-col">
                  <div className="candidate-title-line">
                    <span className="candidate-mfg">{candidate.manufacturer}</span>
                    <h3 className="candidate-part-num tech-font">{candidate.partNumber}</h3>
                    <span className="candidate-name">{candidate.name}</span>
                  </div>

                  <p className="candidate-description">{candidate.description}</p>

                  {/* Key specs badge pills */}
                  <div className="key-specs-flow">
                    <div className="spec-tag-item">
                      <span className="spec-k">Thread:</span>
                      <strong className="spec-v tech-font">{candidate.keySpecs['Thread Size']}</strong>
                    </div>

                    <div className="spec-tag-item">
                      <span className="spec-k">Sensing Sn:</span>
                      <strong className="spec-v tech-font text-teal">{candidate.keySpecs['Sensing Distance (Sn)']}</strong>
                    </div>

                    <div className="spec-tag-item">
                      <span className="spec-k">Housing:</span>
                      <strong className="spec-v tech-font">{candidate.keySpecs['Housing Length']}</strong>
                    </div>

                    <div className="spec-tag-item">
                      <span className="spec-k">Material:</span>
                      <strong className="spec-v">{candidate.keySpecs['Housing Material']}</strong>
                    </div>

                    <div className="spec-tag-item">
                      <span className="spec-k">Protection:</span>
                      <strong className="spec-v text-teal">{candidate.keySpecs['Ingress Protection']}</strong>
                    </div>
                  </div>

                  {/* Uncertainty / Caveat callouts if any */}
                  {candidate.uncertaintyNotes.length > 0 && (
                    <div className="uncertainty-callout-row">
                      <AlertTriangle size={13} className="text-amber" />
                      <span>
                        <strong>Engineering Flag:</strong> {candidate.uncertaintyNotes[0]}
                      </span>
                    </div>
                  )}

                  {/* Evidence quick citation */}
                  {candidate.evidence.length > 0 && (
                    <div className="evidence-citation-line">
                      <ShieldCheck size={13} className="text-teal" />
                      <span>Source Evidence:</span>
                      <button
                        type="button"
                        className="citation-btn"
                        onClick={() => setActiveEvidence(candidate.evidence[0])}
                      >
                        <span>{candidate.evidence[0].sourceTitle}</span>
                        <ExternalLink size={11} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: Supplier Offers, Price, Lead Time & Actions */}
                <div className="candidate-pricing-col">
                  {bestOffer ? (
                    <div className="offer-summary-box">
                      <div className="offer-source-header">
                        <span className="offer-seller">{bestOffer.supplierName}</span>
                        <span className={`freshness-badge freshness-${bestOffer.freshness}`}>
                          {bestOffer.freshness === 'fresh' ? 'Fresh < 4h' : 'Stale > 24h'}
                        </span>
                      </div>

                      <div className="reported-price-row">
                        <span className="price-currency">{bestOffer.currency}</span>
                        <span className="price-amount tech-font">${bestOffer.reportedPrice.toFixed(2)}</span>
                        <span className="price-unit">/ unit</span>
                      </div>

                      <div className="stock-lead-row">
                        <span className="stock-tag tag-instock">
                          <CheckCircle2 size={12} />
                          <span>{bestOffer.quantityAvailable ? `${bestOffer.quantityAvailable} In Stock` : 'In Stock'}</span>
                        </span>
                        <span className="lead-tag tech-font">
                          {bestOffer.leadTimeDays === 1 ? 'Next-Day Delivery' : `${bestOffer.leadTimeDays}d Lead Time`}
                        </span>
                      </div>

                      <div className="demo-timestamp-row">
                        <DemoBadge variant="timestamp-only" lastChecked={bestOffer.lastChecked} />
                      </div>
                    </div>
                  ) : (
                    <div className="no-offers-box">
                      <span>No direct supplier listings found</span>
                    </div>
                  )}

                  <div className="candidate-card-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/app/compare/${candidate.id}`)}
                    >
                      <Scale size={14} />
                      <span>Compare Specs</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => navigate(`/app/parts/${candidate.id}`)}
                    >
                      <span>3D Model & Offers</span>
                    </button>

                    <button
                      type="button"
                      className={`btn btn-icon-sm ${isSaved ? 'btn-saved' : 'btn-outline'}`}
                      onClick={() => toggleSavePart(candidate.id)}
                      title={isSaved ? 'Remove from Saved' : 'Save to Workspace'}
                      aria-label="Save Part"
                    >
                      <Bookmark size={14} className={isSaved ? 'fill-current' : ''} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};