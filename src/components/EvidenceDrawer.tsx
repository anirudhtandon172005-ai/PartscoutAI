import React from 'react';
import { useApp } from '../context/AppContext';
import { X, ExternalLink, ShieldCheck, FileText, CheckCircle2, AlertTriangle, Calendar, Globe } from 'lucide-react';

export const EvidenceDrawer: React.FC = () => {
  const { activeEvidence, setActiveEvidence, addToast } = useApp();

  if (!activeEvidence) return null;

  return (
    <div className="drawer-overlay" onClick={() => setActiveEvidence(null)}>
      <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title-group">
            <span className="badge-tag live-cad">
              <ShieldCheck size={13} className="text-teal" /> Verified Source Evidence
            </span>
            <h3 className="drawer-title">{activeEvidence.claim}</h3>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={() => setActiveEvidence(null)}
            aria-label="Close Evidence Drawer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          <div className="drawer-section">
            <label className="drawer-label">Source Document & Origin</label>
            <div className="evidence-source-card">
              <div className="source-meta-row">
                <div className="source-title-row">
                  <FileText size={16} className="text-teal" />
                  <strong>{activeEvidence.sourceTitle}</strong>
                </div>
                <span className="source-type-pill">{activeEvidence.sourceType}</span>
              </div>

              <div className="source-domain-row">
                <Globe size={13} className="text-muted" />
                <span className="tech-font">{activeEvidence.sourceDomain}</span>
                <a
                  href={activeEvidence.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link-btn"
                >
                  <span>Open Document</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>

          <div className="drawer-section">
            <label className="drawer-label">Extracted Primary Excerpt</label>
            <div className="evidence-quote-box">
              <p className="quote-text">"{activeEvidence.excerpt}"</p>
            </div>
            <p className="excerpt-caption">
              Extracted via deterministic DOM table parser from {activeEvidence.sourceDomain}. Normalized to ISO metric standard.
            </p>
          </div>

          <div className="drawer-meta-grid">
            <div className="meta-card">
              <span className="meta-card-label">Crawler Timestamp</span>
              <div className="meta-card-value tech-font">
                <Calendar size={13} />
                <span>{activeEvidence.retrievalTimestamp}</span>
              </div>
            </div>

            <div className="meta-card">
              <span className="meta-card-label">Parser Confidence</span>
              <div className="meta-card-value text-teal tech-font">
                <CheckCircle2 size={13} />
                <span>{activeEvidence.confidence}% Deterministic Match</span>
              </div>
            </div>
          </div>

          <div className="drawer-disclaimer-card">
            <AlertTriangle size={15} className="text-amber" />
            <div className="disclaimer-text">
              <strong>Engineering Responsibility:</strong> Technical excerpts are captured from public documentation for prototype evaluation. Always review the complete manufacturer installation manual prior to commissioning machinery.
            </div>
          </div>
        </div>

        <div className="drawer-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              addToast(
                'Audit Entry Logged',
                `Specification evidence flagged for maintenance shift logbook review.`,
                'info'
              );
              setActiveEvidence(null);
            }}
          >
            Mark for Shift Review
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setActiveEvidence(null)}
          >
            Done Inspecting
          </button>
        </div>
      </div>
    </div>
  );
};
