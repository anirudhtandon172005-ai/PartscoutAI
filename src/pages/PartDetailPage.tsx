import React from 'react';
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
  Award,
} from 'lucide-react';
import { RankingAuditModal } from '../components/RankingAuditModal';

function getCategoryStandard(category?: string, name?: string): string {
  const combined = `${category || ''} ${name || ''}`.toLowerCase();
  if (combined.includes('nail') || combined.includes('fastener')) return 'ASTM F1667 FASTENER SPEC';
  if (combined.includes('bolt') || combined.includes('screw') || combined.includes('hex')) return 'ISO 4014 / DIN 931 STANDARD';
  if (combined.includes('bearing') || combined.includes('ball bearing')) return 'ISO 492 / DIN 625 BEARING';
  if (combined.includes('motor') || combined.includes('induction')) return 'IEC 60034-1 / NEMA MG-1';
  if (combined.includes('valve') || combined.includes('solenoid') || combined.includes('pneumatic')) return 'ISO 5599 PNEUMATIC';
  if (combined.includes('cable') || combined.includes('m12') || combined.includes('cordset')) return 'IEC 61076-2-101 CORDSET';
  return 'IEC 60947-5-2 GEOMETRY';
}

export const PartDetailPage: React.FC<{ partId?: string }> = ({ partId = 'part-ifm-igt205' }) => {
  const { allParts, targetPart, navigate, toggleSavePart, isPartSaved, setActiveEvidence } = useApp();

  const component = allParts.find((p) => p.id === partId) || allParts[1];
  const isSaved = isPartSaved(component.id);
  const isBaseline = component.id === targetPart.id;
  const [showAuditModal, setShowAuditModal] = React.useState(false);

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
            className="btn btn-outline"
            style={{ borderColor: 'rgba(45, 212, 191, 0.45)', color: '#2dd4bf' }}
            onClick={() => setShowAuditModal(true)}
            title="Inspect 15-parameter algorithmic ranking audit"
          >
            <Award size={16} className="text-teal" />
            <span>15-Param Audit</span>
          </button>

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
              onClick={() => navigate(`/app/compare/${component.id}`)}
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
              <span className="tech-font text-muted-xs">{getCategoryStandard(component.category, component.name)}</span>
            </div>
            <ThreePartViewer
              partNumber={component.partNumber}
              manufacturer={component.manufacturer}
              partName={component.name}
              category={component.category}
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
              <span className="tech-font text-muted-xs">12 Parameters Verified</span>
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

            <div className="panel-footer-disclaimer">
              <AlertTriangle size={13} className="text-amber" />
              <span>
                <strong>Procurement Confirmation Required:</strong> Supplier pages may have experienced inventory changes since crawler index time. Always verify live stock before issuing machine purchase orders.
              </span>
            </div>
          </div>
        </div>
      </div>

      <RankingAuditModal
        candidate={component}
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />
    </div>
  );
};
