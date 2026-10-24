import React from 'react';
import { useApp } from '../context/AppContext';
import { DemoBadge } from '../components/DemoBadge';
import { DEMO_SEARCH_ID } from '../data/mockData';
import {
  Bookmark,
  Scale,
  Trash2,
  ExternalLink,
  Cpu,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const SavedPartsPage: React.FC = () => {
  const { allParts, savedPartIds, toggleSavePart, navigate, addToast } = useApp();

  const savedParts = allParts.filter((p) => savedPartIds.includes(p.id));

  return (
    <div className="saved-parts-root">
      {/* Top Banner Notice */}
      <DemoBadge variant="banner" lastChecked="Local Workspace Storage" />

      {/* Header */}
      <div className="saved-header-row">
        <div>
          <div className="kicker-line">
            <span className="badge-tag live-cad">ENGINEERING BENCH</span>
            <span className="text-muted-xs">Persisted in Local Storage</span>
          </div>
          <h1 className="saved-title">Saved Parts & Cross-References</h1>
          <p className="saved-sub">
            Components pinned for active shift evaluation and comparative technical analysis.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/app/requests/new/machine')}
        >
          <span>Search for More Parts</span>
        </button>
      </div>

      {savedParts.length === 0 ? (
        <div className="empty-saved-card">
          <Bookmark size={40} className="text-muted" />
          <h3>No Parts Saved Yet</h3>
          <p>
            When inspecting search results or datasheets, click "Save to Workspace" to bookmark components here.
          </p>
          <button
            type="button"
            className="btn btn-outline mt-3"
            onClick={() => navigate(`/app/results/${DEMO_SEARCH_ID}`)}
          >
            <span>Explore Line 4 Proximity Sensor Candidates</span>
            <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div className="saved-grid">
          {savedParts.map((part) => (
            <div key={part.id} className="saved-part-card">
              <div className="saved-card-header">
                <div>
                  <span className="saved-mfg">{part.manufacturer}</span>
                  <h3 className="saved-part-num tech-font">{part.partNumber}</h3>
                  <span className="saved-name">{part.name}</span>
                </div>
                <button
                  type="button"
                  className="btn-remove-saved"
                  onClick={() => toggleSavePart(part.id)}
                  title="Remove from saved collection"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <p className="saved-desc">{part.description}</p>

              <div className="saved-specs-snippet">
                {Object.entries(part.keySpecs)
                  .slice(0, 4)
                  .map(([k, v]) => (
                    <div key={k} className="snippet-row">
                      <span className="snippet-k">{k}:</span>
                      <strong className="snippet-v tech-font">{v}</strong>
                    </div>
                  ))}
              </div>

              <div className="saved-card-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(`/app/search/${DEMO_SEARCH_ID}/compare/${part.id}`)}
                >
                  <Scale size={13} />
                  <span>Compare</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate(`/app/search/${DEMO_SEARCH_ID}/parts/${part.id}`)}
                >
                  <span>3D Twin & Offers</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
