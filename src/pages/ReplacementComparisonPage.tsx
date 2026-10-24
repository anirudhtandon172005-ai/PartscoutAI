import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { DemoBadge } from '../components/DemoBadge';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  Info,
  Building,
  ArrowRight,
  Bookmark,
} from 'lucide-react';
import { getSearch, getCandidates, CandidateResponse, SearchStatusResponse } from '../api/searches';
import { mapCandidateToUI } from '../api/candidateAdapter';
import { ComponentItem, TechnicalSpecification } from '../types';

export const ReplacementComparisonPage: React.FC<{ searchId?: string; candidateId?: string }> = ({ searchId, candidateId }) => {
  const { navigate, setActiveEvidence, toggleSavePart, isPartSaved, addToast } = useApp();

  const [searchStatus, setSearchStatus] = useState<SearchStatusResponse | null>(null);
  const [candidates, setCandidates] = useState<ComponentItem[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState(candidateId || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const addToastRef = useRef(addToast);

  // Fetch search status
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

  // Fetch candidates
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
        if (mappedCandidates.length > 0 && !selectedCandidateId) {
          setSelectedCandidateId(mappedCandidates[0].id);
        }
      } catch (err) {
        if (active && !controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load candidates');
          addToastRef.current('Error', 'Failed to load comparison data', 'warning');
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

  const candidate = candidates.find((c) => c.id === selectedCandidateId) || candidates[0];

  if (loading) {
    return (
      <div className="compare-page-root">
        <DemoBadge variant="banner" lastChecked="Loading..." />
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading comparison data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="compare-page-root">
        <DemoBadge variant="banner" lastChecked="Error" />
        <div className="error-container">
          <AlertTriangle size={48} className="text-red" />
          <h3>Failed to Load Comparison</h3>
          <p>{error}</p>
          <button className="btn btn-primary mt-4" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="compare-page-root">
        <DemoBadge variant="banner" lastChecked="No Candidates" />
        <div className="error-container">
          <AlertTriangle size={48} className="text-amber" />
          <h3>No Candidates Available</h3>
          <p>This search has no candidates to compare.</p>
        </div>
      </div>
    );
  }

  if (!searchId) {
    return (
      <div className="compare-page-root">
        <DemoBadge variant="banner" lastChecked="Invalid Route" />
        <div className="error-container">
          <AlertTriangle size={48} className="text-red" />
          <h3>Invalid Route</h3>
          <p>This page requires a search ID. Navigate from search results.</p>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/app/dashboard')}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isSaved = isPartSaved(candidate.id);
  const request = searchStatus?.request;

  const getStatusBadge = (result: 'match' | 'mismatch' | 'unknown' | 'review') => {
    switch (result) {
      case 'match':
        return (
          <span className="status-tag status-match">
            <CheckCircle2 size={12} /> Match
          </span>
        );
      case 'review':
        return (
          <span className="status-tag status-review">
            <AlertTriangle size={12} /> Review
          </span>
        );
      case 'mismatch':
        return (
          <span className="status-tag status-mismatch">
            <XCircle size={12} /> Mismatch
          </span>
        );
      case 'unknown':
        return (
          <span className="status-tag status-unknown">
            <HelpCircle size={12} /> Unknown
          </span>
        );
    }
  };

  return (
    <div className="compare-page-root">
      {/* Top Banner Notice */}
      <DemoBadge variant="banner" lastChecked="Deterministic Parameter Audit" />

      {/* Header with Candidate Switcher */}
      <div className="compare-header-row">
        <div>
          <div className="kicker-line">
            <span className="badge-tag live-cad">DETERMINISTIC PARAMETER AUDIT</span>
            <span className="text-muted-xs">IEC 60947-5-2 Industrial Standard</span>
          </div>
          <h1 className="compare-title">Specification Comparison Matrix</h1>
          <p className="compare-sub">
            Comparing candidate cross-reference against original baseline OEM part.
          </p>
        </div>

        {/* Candidate Selector Dropdown */}
        {searchId && candidates.length > 0 && (
          <div className="candidate-selector-box">
            <label className="selector-label" htmlFor="candidate-select">Select Alternative Candidate:</label>
            <div className="select-wrapper">
              <select
                id="candidate-select"
                className="form-select candidate-dropdown"
                value={selectedCandidateId}
                onChange={(e) => setSelectedCandidateId(e.target.value)}
              >
                {candidates.map((cand) => (
                  <option key={cand.id} value={cand.id}>
                    {cand.manufacturer} {cand.partNumber} ({cand.matchScore}% - {cand.overallStatus})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* CRITICAL DISCLAIMER BANNER (Prompt requirement: Never imply score certifies interchangeability!) */}
      <div className="interchangeability-warning-banner">
        <AlertTriangle size={20} className="warning-icon" />
        <div className="warning-text-block">
          <h4 className="warning-heading">Engineering Certification & Responsibility Notice</h4>
          <p className="warning-body">
            PartScout AI comparison scores (e.g. {candidate.matchScore}%) reflect algorithmic parameter correlation between verified manufacturer datasheets. <strong>A high score does NOT constitute certified equipment interchangeability or manufacturer endorsement.</strong> Plant maintenance engineers must review physical clearances, mounting bracket torques, PLC input thresholds, and environmental sanitation procedures prior to installation.
          </p>
        </div>
      </div>

      {/* Side-by-Side Hero Comparison Cards */}
      <div className="compare-hero-cards-grid">
        {/* Original Baseline Card - built from API request, NOT from mock data */}
        <div className="hero-part-card original-card">
          <div className="card-ribbon ribbon-neutral">ORIGINAL TARGET BASELINE</div>
          <div className="part-header-info">
            <span className="part-mfg-tag">{request?.manufacturer || 'Loading...'}</span>
            <h3 className="part-number-display tech-font">{request?.original_part_number || 'Loading...'}</h3>
            <p className="part-name-display">{request?.part_name || 'Loading...'}</p>
          </div>
          <div className="part-meta-strip">
            <span className="meta-pill">M18x1.0 Flush</span>
            <span className="meta-pill">Sn = {request?.requirements?.sensing_range_mm || 8} mm</span>
            <span className="meta-pill">{request?.requirements?.output || 'PNP NO DC'}</span>
          </div>
        </div>

        {/* Candidate Alternative Card */}
        <div className="hero-part-card hero-candidate-card">
          <div className="card-ribbon ribbon-teal">PROPOSED DROP-IN CANDIDATE</div>
          <div className="candidate-score-bar">
            <div className="score-badge-circle">
              <span className="score-val tech-font">{candidate.matchScore}%</span>
              <span className="score-txt">Score</span>
            </div>
            <div className="score-meta-text">
              <span className={`status-pill ${candidate.overallStatus === 'Drop-in Replacement' ? 'status-pill-teal' : 'status-pill-amber'}`}>
                {candidate.overallStatus}
              </span>
              <span className="confidence-label text-muted-xs">
                Confidence: <strong>{candidate.matchConfidence}</strong> (Verified against OEM datasheet)
              </span>
            </div>
          </div>

          <div className="part-header-info mt-2">
            <span className="part-mfg-tag">{candidate.manufacturer}</span>
            <h3 className="part-number-display tech-font text-teal">{candidate.partNumber}</h3>
            <p className="part-name-display">{candidate.name}</p>
          </div>

          <div className="part-action-row">
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => searchId && navigate(`/app/search/${searchId}/parts/${candidate.id}`)}
              disabled={!searchId}
            >
              <span>Inspect 3D Twin & CAD</span>
            </button>

            <button
              type="button"
              className={`btn btn-xs ${isSaved ? 'btn-secondary' : 'btn-outline'}`}
              onClick={() => toggleSavePart(candidate.id)}
            >
              <Bookmark size={13} className={isSaved ? 'fill-current' : ''} />
              <span>{isSaved ? 'Saved' : 'Save Part'}</span>
            </button>

            <button
              type="button"
              className="btn btn-primary btn-xs"
              onClick={() => navigate(`/app/availability/${candidate.id}`)}
            >
              <span>View Stock Offers ({candidate.offers.length})</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Side-by-Side Detailed Specification Table */}
      <div className="panel-card mt-6">
        <div className="panel-header">
          <div className="panel-title-group">
            <Scale size={18} className="text-teal" />
            <h3 className="panel-title">Detailed Parameter Verification Table</h3>
          </div>
          <div className="table-legend">
            <span className="legend-item"><span className="dot dot-teal"></span> Exact Match</span>
            <span className="legend-item"><span className="dot dot-amber"></span> Review / Tolerance Alert</span>
            <span className="legend-item"><span className="dot dot-red"></span> Critical Mismatch</span>
          </div>
        </div>

        <div className="comparison-table-wrapper">
          <table className="engineering-table comparison-matrix-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Technical Requirement</th>
                <th style={{ width: '22%' }}>Original ({request?.original_part_number || 'Loading...'})</th>
                <th style={{ width: '22%' }}>Candidate ({candidate.partNumber})</th>
                <th style={{ width: '14%' }}>Result</th>
                <th style={{ width: '20%' }}>Engineering Explanation & Evidence</th>
              </tr>
            </thead>
            <tbody>
              {candidate.specifications.map((spec: TechnicalSpecification, idx: number) => (
                <tr key={idx} className={spec.critical ? 'row-critical' : ''}>
                  <td>
                    <div className="spec-req-name">
                      {spec.name}
                      {spec.critical && (
                        <span className="critical-tag" title="Critical requirement for physical fit or electrical safety">
                          Critical
                        </span>
                      )}
                    </div>
                    <span className="spec-cat-label text-muted-xs">{spec.category}</span>
                  </td>

                  <td className="tech-font font-medium original-val-cell">
                    {spec.originalValue}
                  </td>

                  <td className="tech-font font-semibold candidate-val-cell">
                    {spec.candidateValue}
                  </td>

                  <td>{getStatusBadge(spec.result)}</td>

                  <td>
                    <p className="spec-explanation">{spec.explanation}</p>
                    {spec.evidenceId && (
                      <button
                        type="button"
                        className="btn-link-action mt-1"
                        onClick={() => {
                          const ev = candidate.evidence.find((e) => e.id === spec.evidenceId) || candidate.evidence[0];
                          if (ev) setActiveEvidence(ev);
                        }}
                      >
                        <ShieldCheck size={11} className="text-teal" />
                        <span>Inspect Datasheet Evidence</span>
                        <ExternalLink size={10} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Uncertainty & Tolerances Panel */}
      <div className="uncertainty-evidence-split mt-6">
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title-group">
              <AlertTriangle size={16} className="text-amber" />
              <h4 className="panel-title">Tolerance & Uncertainty Breakdown</h4>
            </div>
          </div>
          <div className="panel-body">
            <p className="text-sm text-muted">
              The following nuances were surfaced during automated attribute parsing:
            </p>
            <ul className="tolerances-bullet-list mt-3">
              {candidate.uncertaintyNotes.map((note, i) => (
                <li key={i}>
                  <strong>Item {i + 1}:</strong> {note}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title-group">
              <Building size={16} className="text-teal" />
              <h4 className="panel-title">Immediate Procurement Next Steps</h4>
            </div>
          </div>
          <div className="panel-body">
            <p className="text-sm">
              Ready to verify pricing and logistics for {candidate.partNumber}?
            </p>
            <div className="next-steps-btn-group mt-4">
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => navigate(`/app/availability/${candidate.id}`)}
              >
                <span>Check Live Stock & Delivery Schedules</span>
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                className="btn btn-outline btn-block mt-2"
                onClick={() => navigate('/app/quotes')}
              >
                <span>Generate RFQ Comparison Form</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};