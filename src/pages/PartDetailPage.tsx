import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ThreePartViewer } from '../components/ThreePartViewer';
import { DemoBadge } from '../components/DemoBadge';
import {
  Scale,
  Bookmark,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building,
  Clock,
  ArrowRight,
  FileText,
  FileCheck2,
  Zap,
} from 'lucide-react';
import { getSearch, getCandidates, CandidateResponse, SearchStatusResponse } from '../api/searches';
import { mapCandidateToUI } from '../api/candidateAdapter';
import { ComponentItem } from '../types';

export const PartDetailPage: React.FC<{ searchId?: string; candidateId?: string }> = ({ searchId, candidateId }) => {
  const { navigate, toggleSavePart, isPartSaved, setActiveEvidence, addToast } = useApp();

  const [searchStatus, setSearchStatus] = useState<SearchStatusResponse | null>(null);
  const [component, setComponent] = useState<ComponentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const addToastRef = useRef(addToast);

  // Require searchId and candidateId - no legacy mode
  if (!searchId || !candidateId) {
    return (
      <div className="part-detail-root">
        <DemoBadge variant="banner" lastChecked="Invalid Route" />
        <div className="error-container">
          <AlertTriangle size={48} className="text-red" />
          <h3>Invalid Route</h3>
          <p>This page requires a search ID and candidate ID. Navigate from search results.</p>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/app/dashboard')}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Fetch search status (new API mode)
  useEffect(() => {
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

  // Fetch candidates and find the specific one (new API mode)
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const fetchCandidate = async () => {
      try {
        setLoading(true);
        const response = await getCandidates(searchId, controller.signal);
        if (!active) return;
        const mappedCandidates = response.items.map(mapCandidateToUI);
        const found = mappedCandidates.find((c) => c.id === candidateId);
        if (found) {
          setComponent(found);
        } else {
          setError(`Candidate ${candidateId} not found in search ${searchId}`);
          addToastRef.current('Error', 'Candidate not found', 'warning');
        }
      } catch (err) {
        if (active && !controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load candidate');
          addToastRef.current('Error', 'Failed to load candidate details', 'warning');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchCandidate();
    return () => {
      active = false;
      controller.abort();
    };
  }, [searchId, candidateId]);

  if (loading) {
    return (
      <div className="part-detail-root">
        <DemoBadge variant="banner" lastChecked="Loading..." />
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading candidate details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="part-detail-root">
        <DemoBadge variant="banner" lastChecked="Error" />
        <div className="error-container">
          <AlertTriangle size={48} className="text-red" />
          <h3>Failed to Load Candidate</h3>
          <p>{error}</p>
          <button className="btn btn-primary mt-4" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!component) {
    return (
      <div className="part-detail-root">
        <DemoBadge variant="banner" lastChecked="Not Found" />
        <div className="error-container">
          <AlertTriangle size={48} className="text-amber" />
          <h3>Candidate Not Found</h3>
          <p>No candidate data available for the specified search and candidate ID.</p>
        </div>
      </div>
    );
  }

  const isSaved = isPartSaved(component.id);
  const request = searchStatus?.request;
  // Check if this candidate is the baseline (original part)
  const isBaseline = request?.original_part_number === component.partNumber;

  return (
    <div className="part-detail-root">
      {/* Top Banner Notice */}
      <DemoBadge variant="banner" lastChecked="Catalog Sync 12:45 UTC" />

      {/* Header Row */}
      <div className="detail-header-row">
        <div className="detail-meta-group">
          <div className="kicker-line">
            <span className="badge-tag live-cad">
              {isBaseline ? 'ORIGINAL OEM BASELINE' : `${component.matchScore}% COMPATIBILITY MATCH`}
            </span>
            <span className="text-muted-xs">{component.category}</span>
          </div>
          <h1 className="detail-title">{component.name}</h1>
          <div className="detail-subtitle-row">
            <span className="detail-mfg">{component.manufacturer}</span>
            <span className="detail-pn tech-font">{component.partNumber}</span>
            <span className={`status-pill ${component.overallStatus === 'Drop-in Replacement' ? 'status-pill-teal' : 'status-pill-amber'}`}>
              {component.overallStatus}
            </span>
          </div>
        </div>

        <div className="detail-actions-group">
          <button
            type="button"
            className={`btn ${isSaved ? 'btn-secondary' : 'btn-outline'}`}
            onClick={() => toggleSavePart(component.id)}
          >
            <Bookmark size={16} className={isSaved ? 'fill-current' : ''} />
            <span>{isSaved ? 'Saved in Workspace' : 'Save to Workspace'}</span>
          </button>

          {!isBaseline && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(`/app/search/${searchId}/compare/${component.id}`)}
              disabled={!searchId}
            >
              <Scale size={16} />
              <span>Compare with OEM Baseline</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/app/quotes')}
          >
            <span>Request Quotation</span>
          </button>
        </div>
      </div>

      {/* Split: 3D Twin Viewer on Left, Technical Datasheet on Right */}
      <div className="detail-grid-split">
        {/* Left: 3D Industrial Component Viewer */}
        <div className="detail-visual-col">
          <div className="visual-panel-card">
            <div className="visual-header">
              <span className="visual-label">INTERACTIVE 3D COMPONENT TWIN</span>
              <span className="tech-font text-muted-xs">IEC 60947-5-2 GEOMETRY</span>
            </div>
            <ThreePartViewer
              partNumber={component.partNumber}
              manufacturer={`${component.manufacturer} • M18x1.0`}
              highlightSpecs={true}
            />
          </div>

          {/* Uncertainty & Critical Engineering Notes */}
          {component.uncertaintyNotes.length > 0 && (
            <div className="uncertainty-box mt-4">
              <div className="uncertainty-title">
                <AlertTriangle size={16} className="text-amber" />
                <strong>Engineering Verification Flags</strong>
              </div>
              <ul className="uncertainty-list">
                {component.uncertaintyNotes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Verified Evidence Excerpts */}
          {component.evidence.length > 0 && (
            <div className="evidence-panel-card mt-4">
              <div className="panel-header">
                <div className="panel-title-group">
                  <ShieldCheck size={16} className="text-teal" />
                  <h4 className="panel-title">Source Citations & Primary Documents</h4>
                </div>
              </div>

              <div className="evidence-items-list">
                {component.evidence.map((ev) => (
                  <div key={ev.id} className="evidence-card-item">
                    <div className="ev-claim">{ev.claim}</div>
                    <div className="ev-source-row">
                      <span className="ev-source-title">{ev.sourceTitle}</span>
                      <span className="ev-domain tech-font">{ev.sourceDomain}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-link-action mt-2"
                      onClick={() => setActiveEvidence(ev)}
                    >
                      <span>Inspect Verbatim Excerpt & Crawler Timestamp</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Technical Attributes & Supplier Offers */}
        <div className="detail-specs-col">
          {/* Key Technical Specifications Table */}
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title-group">
                <FileText size={16} className="text-teal" />
                <h3 className="panel-title">Technical Specifications</h3>
              </div>
              <span className="tech-font text-muted-xs">
                {Object.keys(component.keySpecs).length} Parameters Verified
              </span>
            </div>

            <div className="specs-table-wrapper">
              <table className="engineering-table specs-kv-table">
                <tbody>
                  {Object.entries(component.keySpecs).map(([key, val]) => (
                    <tr key={key}>
                      <td className="spec-key-col font-medium">{key}</td>
                      <td className="spec-val-col tech-font">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Supplier Availability & Offers Table */}
          <div className="panel-card mt-6">
            <div className="panel-header">
              <div className="panel-title-group">
                <Building size={16} className="text-teal" />
                <h3 className="panel-title">Reported Supplier Offers & Stock</h3>
              </div>
              <DemoBadge variant="inline" customText="Demo Pricing" lastChecked="Simulated Feed" />
            </div>

            {component.offers.length > 0 ? (
              <div className="offers-table-wrapper">
                <table className="engineering-table">
                  <thead>
                    <tr>
                      <th>Distributor / Seller</th>
                      <th>Reported Price</th>
                      <th>Stock / Lead Time</th>
                      <th>Freshness</th>
                      <th>Handoff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {component.offers.map((offer) => (
                      <tr key={offer.id}>
                        <td>
                          <strong>{offer.supplierName}</strong>
                          <div className="text-muted-xs tech-font">{offer.supplierDomain} • {offer.location}</div>
                          {offer.notes && <div className="offer-note-sm">{offer.notes}</div>}
                        </td>
                        <td>
                          <span className="tech-font font-semibold text-lg">
                            ${offer.reportedPrice.toFixed(2)}
                          </span>
                          <div className="text-muted-xs">{offer.currency} / MOQ: {offer.minOrderQuantity}</div>
                        </td>
                        <td>
                          <span className={`status-pill ${offer.stockStatus === 'In Stock' ? 'status-pill-teal' : 'status-pill-amber'}`}>
                            {offer.stockStatus}
                          </span>
                          <div className="text-muted-xs tech-font">
                            {offer.quantityAvailable ? `${offer.quantityAvailable} units` : 'Inquire for lot'} • {offer.leadTimeDays}d dispatch
                          </div>
                        </td>
                        <td>
                          <span className={`freshness-badge freshness-${offer.freshness}`}>
                            {offer.freshness === 'fresh' ? 'Fresh < 4h' : 'Stale > 24h'}
                          </span>
                          <div className="text-muted-xs tech-font">{offer.lastChecked}</div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-outline btn-xs"
                            onClick={() => navigate(`/app/suppliers/${offer.supplierId}`)}
                          >
                            <span>Supplier Profile</span>
                            <ExternalLink size={11} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-offers-box">
                <AlertTriangle size={24} className="text-amber" />
                <p>No supplier offers available from API. Integrate supplier feed for live data.</p>
              </div>
            )}

            <div className="panel-footer-disclaimer">
              <AlertTriangle size={13} className="text-amber" />
              <span>
                <strong>Procurement Confirmation Required:</strong> Supplier pages may have experienced inventory changes since crawler index time. Always verify live stock before issuing machine purchase orders.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};