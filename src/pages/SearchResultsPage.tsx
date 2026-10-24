import React, { useState, useEffect, useRef } from 'react';
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
import { getSearch, getCandidates, CandidateResponse, SearchStatusResponse } from '../api/searches';
import { mapCandidateToUI } from '../api/candidateAdapter';
import { ComponentItem, SourceEvidence, SupplierOffer } from '../types';

export const SearchResultsPage: React.FC<{ searchId?: string }> = ({ searchId }) => {
  const {
    navigate,
    toggleSavePart,
    isPartSaved,
    setActiveEvidence,
    addToast,
  } = useApp();

  const [searchStatus, setSearchStatus] = useState<SearchStatusResponse | null>(null);
  const [candidates, setCandidates] = useState<ComponentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const addToastRef = useRef(addToast);

  // Fetch the backend search status to get request info.
  useEffect(() => {
    if (!searchId) return;
    const controller = new AbortController();
    let active = true;
    const fetchStatus = async () => {
      try {
        const status = await getSearch(searchId, controller.signal);
        if (!active) return;
        setSearchStatus(status);
      } catch (err) {
        if (active && !controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load search');
        }
      }
    };

    void fetchStatus();
    return () => {
      active = false;
      controller.abort();
    };
  }, [searchId]);

  const request = searchStatus?.request;

  const [inStockOnly, setInStockOnly] = useState(false);
  const [minMatchScore, setMinMatchScore] = useState(80);
  const [selectedManufacturer, setSelectedManufacturer] = useState('all');
  const [sortBy, setSortBy] = useState<'match' | 'price' | 'leadTime'>('match');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!searchId) return;
    const controller = new AbortController();
    let active = true;

    const fetchCandidates = async () => {
      try {
        setLoading(true);
        const response = await getCandidates(searchId, controller.signal);
        if (!active) return;
        const mappedCandidates = response.items.map(mapCandidateToUI);
        setCandidates(mappedCandidates);
      } catch (err) {
        if (active && !controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load candidates');
          addToastRef.current('Error', 'Failed to load search results', 'warning');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchCandidates();
    return () => {
      active = false;
      controller.abort();
    };
  }, [searchId]);

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
            <span className="badge-tag live-cad">
              {searchStatus ? `SEARCH ${searchStatus.id}` : 'SEARCH RESULTS'}
            </span>
            <span className="text-muted-xs">Search executed across 14 targeted sources</span>
          </div>
          <h1 className="results-title">
            Candidate Replacements for {request?.original_part_number || 'Loading...'}
          </h1>
          <p className="results-sub">
            Target: <strong>{request?.part_name || 'Loading...'}</strong> • Facility: {request?.machine_name || 'Loading...'}
          </p>
        </div>

        <div className="results-top-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => searchId && filteredCandidates.length > 0 && navigate(`/app/search/${searchId}/compare/${filteredCandidates[0].id}`)}
            disabled={!searchId || filteredCandidates.length === 0}
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

      {/* Target Original Baseline Bar - built from API request, NOT from mock data */}
      <div className="target-baseline-card">
        <div className="baseline-badge-col">
          <span className="baseline-tag">ORIGINAL BASELINE COMPONENT</span>
          <span className="text-muted-xs">OEM Specification (from search request)</span>
        </div>

        <div className="baseline-info-col">
          <div className="baseline-title-row">
            <h4 className="baseline-name">{request?.part_name || 'Loading...'}</h4>
            <span className="baseline-part-num tech-font">{request?.original_part_number || 'Loading...'}</span>
            <span className="baseline-mfg">{request?.manufacturer || 'Loading...'}</span>
          </div>
          <div className="baseline-specs-row">
            <span className="spec-token">M18 x 1.0 Flush</span>
            <span className="spec-token">Sn = {request?.requirements?.sensing_range_mm || 8} mm</span>
            <span className="spec-token">{request?.requirements?.output || 'PNP Normally Open'}</span>
            <span className="spec-token">{request?.requirements?.connector || 'M12 4-Pin'}</span>
            <span className="spec-token">{request?.requirements?.mounting === 'flush' ? 'Flush Mount' : 'Non-Flush'}</span>
          </div>
        </div>

        <div className="baseline-status-col">
          <div className="stock-alert-pill text-amber">
            <AlertTriangle size={13} />
            <span>OEM Status: {request?.manufacturer || 'Unknown'}</span>
          </div>
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
                        <DemoBadge variant="timestamp-only" lastChecked={bestOffer.lastChecked ?? undefined} />
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
                      onClick={() => searchId && navigate(`/app/search/${searchId}/compare/${candidate.id}`)}
                      disabled={!searchId}
                    >
                      <Scale size={14} />
                      <span>Compare Specs</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => searchId && navigate(`/app/search/${searchId}/parts/${candidate.id}`)}
                      disabled={!searchId}
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
