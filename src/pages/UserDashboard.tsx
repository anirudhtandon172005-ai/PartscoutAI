import React from 'react';
import { useApp } from '../context/AppContext';
import { DemoBadge } from '../components/DemoBadge';
import {
  Search,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Cpu,
  Bookmark,
  FileSpreadsheet,
  Activity,
  Layers,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building,
} from 'lucide-react';

export const UserDashboard: React.FC = () => {
  const {
    navigate,
    currentUser,
    requests,
    candidates,
    targetPart,
    savedPartIds,
    allParts,
    quotations,
    machines,
  } = useApp();

  const savedParts = allParts.filter((p) => savedPartIds.includes(p.id));
  const activeRequest = requests[0]; // Line 4 sensor

  return (
    <div className="dashboard-page-root">
      {/* Top Banner Notice */}
      <DemoBadge variant="banner" lastChecked="Today 12:45 UTC" />

      {/* Header with Prominent CTA */}
      <div className="dashboard-header-row">
        <div className="header-greeting">
          <span className="welcome-kicker">APEX PACKWORKS • RELIABILITY & SOURCING CONSOLE</span>
          <h1 className="dashboard-title">Welcome back, {currentUser.name}</h1>
          <p className="dashboard-sub">
            {currentUser.roleTitle} • Connected to 3 plant lines and 14 indexed supplier catalogs.
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn btn-primary btn-lg shadow-lift"
            onClick={() => navigate('/app/requests/new/machine')}
          >
            <PlusCircle size={18} />
            <span>Start a Part Search</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="metrics-grid">
        <div className="metric-card urgent-card">
          <div className="metric-header">
            <span className="metric-label">Critical Line Down</span>
            <AlertTriangle size={18} className="text-orange" />
          </div>
          <div className="metric-body">
            <span className="metric-value tech-font">1</span>
            <span className="metric-unit">Active Alert</span>
          </div>
          <div className="metric-footer">
            <span className="footer-tag tag-orange">Bottling Line 4 Capper</span>
            <button
              type="button"
              className="metric-link-btn"
              onClick={() => navigate(`/app/results/${activeRequest.id}`)}
            >
              Resolve <ArrowRight size={12} />
            </button>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Candidates Evaluated</span>
            <Cpu size={18} className="text-teal" />
          </div>
          <div className="metric-body">
            <span className="metric-value tech-font">4</span>
            <span className="metric-unit">Drop-in Alternatives</span>
          </div>
          <div className="metric-footer">
            <span className="footer-tag tag-teal">Top Match: ifm 96%</span>
            <button
              type="button"
              className="metric-link-btn"
              onClick={() => navigate('/app/compare/part-ifm-igt205')}
            >
              Compare <ArrowRight size={12} />
            </button>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Saved Engineering Parts</span>
            <Bookmark size={18} className="text-primary" />
          </div>
          <div className="metric-body">
            <span className="metric-value tech-font">{savedPartIds.length}</span>
            <span className="metric-unit">In Workspace</span>
          </div>
          <div className="metric-footer">
            <span className="footer-tag tag-neutral">Pinned for Shift</span>
            <button
              type="button"
              className="metric-link-btn"
              onClick={() => navigate('/app/saved')}
            >
              View Saved <ArrowRight size={12} />
            </button>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Illustrative Quotations</span>
            <FileSpreadsheet size={18} className="text-teal" />
          </div>
          <div className="metric-body">
            <span className="metric-value tech-font">{quotations.length}</span>
            <span className="metric-unit">Active RFQs</span>
          </div>
          <div className="metric-footer">
            <span className="footer-tag tag-neutral">Lowest: $92.00</span>
            <button
              type="button"
              className="metric-link-btn"
              onClick={() => navigate('/app/quotes')}
            >
              View RFQs <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Split: Active Investigation on Left, Plant Machines on Right */}
      <div className="dashboard-main-grid">
        {/* Left Column: Recent Part Investigations */}
        <div className="dashboard-column-left">
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title-group">
                <span className="badge-tag live-cad">
                  <Activity size={12} className="text-orange" /> URGENT INVESTIGATION
                </span>
                <h3 className="panel-title">Active Replacement Searches</h3>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-xs"
                onClick={() => navigate('/app/history')}
              >
                <span>View Full History</span>
              </button>
            </div>

            <div className="requests-table-container">
              <table className="engineering-table">
                <thead>
                  <tr>
                    <th>Request Ref</th>
                    <th>Required Part</th>
                    <th>Target Machine</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <span className="tech-font font-semibold">{req.requestNumber}</span>
                        <div className="text-muted-xs">{req.createdAt.split(' ')[0]}</div>
                      </td>
                      <td>
                        <div className="part-cell-name font-medium">{req.partName}</div>
                        <div className="tech-font text-muted-xs">OEM: {req.originalPartNumber}</div>
                      </td>
                      <td>
                        <span className="text-sm">{req.machineName}</span>
                        <div className="urgency-tag-xs">{req.urgency}</div>
                      </td>
                      <td>
                        <span className={`status-pill ${req.status === 'Candidates Found' ? 'status-pill-teal' : 'status-pill-amber'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-primary btn-xs"
                          onClick={() => navigate(`/app/results/${req.id}`)}
                        >
                          <span>Review Intel</span>
                          <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick Investigation Spotlight Banner */}
            {activeRequest && (
              <div className="investigation-spotlight">
                <div className="spotlight-header">
                  <div className="spotlight-title">
                    <span className="spotlight-dot"></span>
                    <strong>Spotlight: Capper Station 3 Proximity Sensor Failure</strong>
                  </div>
                  <DemoBadge variant="inline" customText="Illustrative Sample" lastChecked="35m ago" />
                </div>
                <p className="spotlight-body">
                  Balluff OEM lead-time is currently 4-6 weeks factory backordered. PartScout AI identified <strong>ifm efector IGT205 (96% Match)</strong> with 14 units in stock at McMaster-Carr ready for next-morning dispatch.
                </p>
                <div className="spotlight-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => navigate('/app/compare/part-ifm-igt205')}
                  >
                    <span>Inspect 96% Match Specs</span>
                    <ArrowRight size={12} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    onClick={() => navigate('/app/availability/part-ifm-igt205')}
                  >
                    <span>Check McMaster Stock ($108.40)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Plant Line Equipment Registry */}
          <div className="panel-card mt-6">
            <div className="panel-header">
              <div className="panel-title-group">
                <Building size={16} className="text-muted" />
                <h3 className="panel-title">Facility Asset Registry (Apex PackWorks)</h3>
              </div>
              <span className="badge-tag">3 Registered Lines</span>
            </div>

            <div className="machines-grid">
              {machines.map((mach) => (
                <div key={mach.id} className="machine-item-card">
                  <div className="machine-card-header">
                    <span className="mach-mfg">{mach.manufacturer}</span>
                    <span className={`criticality-badge crit-${mach.criticality.toLowerCase()}`}>
                      {mach.criticality} Priority
                    </span>
                  </div>
                  <h4 className="mach-model">{mach.model}</h4>
                  <div className="mach-line">{mach.productionLine}</div>
                  <p className="mach-notes">{mach.notes}</p>
                  <div className="mach-footer">
                    <span className="text-muted-xs">Commissioned: {mach.commissionYear}</span>
                    <button
                      type="button"
                      className="btn-link-action"
                      onClick={() => {
                        navigate('/app/requests/new/machine');
                      }}
                    >
                      <span>Source Part for Machine</span>
                      <ArrowRight size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Saved Parts & Recent Activity */}
        <div className="dashboard-column-right">
          {/* Saved Parts Quick Shelf */}
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title-group">
                <Bookmark size={16} className="text-teal" />
                <h3 className="panel-title">Saved Parts Library</h3>
              </div>
              <span className="counter-badge">{savedParts.length}</span>
            </div>

            <div className="saved-parts-list">
              {savedParts.length === 0 ? (
                <div className="empty-state-card">
                  <Bookmark size={24} className="text-muted" />
                  <p>No saved parts yet. Bookmark components during search to compare here.</p>
                </div>
              ) : (
                savedParts.map((part) => (
                  <div key={part.id} className="saved-part-compact-item">
                    <div className="saved-part-meta">
                      <span className="saved-part-mfg">{part.manufacturer}</span>
                      <h5 className="saved-part-num tech-font">{part.partNumber}</h5>
                      <span className="saved-part-name">{part.name}</span>
                    </div>

                    <div className="saved-part-actions">
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        onClick={() => navigate(`/app/parts/${part.id}`)}
                      >
                        3D Twin
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => navigate(`/app/compare/${part.id}`)}
                      >
                        Compare
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              className="btn btn-outline btn-block btn-xs mt-3"
              onClick={() => navigate('/app/saved')}
            >
              <span>Manage Saved Collection</span>
            </button>
          </div>

          {/* Plant Reliability Shift Activity Log */}
          <div className="panel-card mt-6">
            <div className="panel-header">
              <div className="panel-title-group">
                <Clock size={16} className="text-muted" />
                <h3 className="panel-title">Shift Activity & Audit Trail</h3>
              </div>
            </div>

            <div className="audit-timeline">
              <div className="timeline-item">
                <div className="timeline-dot dot-orange"></div>
                <div className="timeline-content">
                  <span className="timeline-time tech-font">Today 09:50 UTC</span>
                  <div className="timeline-text">
                    <strong>Marcus Vance</strong> reviewed Radwell surplus quote ($94.50) for Balluff sensor.
                  </div>
                </div>
              </div>

              <div className="timeline-item">
                <div className="timeline-dot dot-teal"></div>
                <div className="timeline-content">
                  <span className="timeline-time tech-font">Today 08:42 UTC</span>
                  <div className="timeline-text">
                    <strong>Discovery Crawler</strong> finished catalog extraction across 14 distributor domains.
                  </div>
                </div>
              </div>

              <div className="timeline-item">
                <div className="timeline-dot dot-primary"></div>
                <div className="timeline-content">
                  <span className="timeline-time tech-font">Today 07:30 UTC</span>
                  <div className="timeline-text">
                    <strong>Marcus Vance</strong> created line-down emergency request <strong>REQ-2026-0891</strong>.
                  </div>
                </div>
              </div>

              <div className="timeline-item">
                <div className="timeline-dot dot-muted"></div>
                <div className="timeline-content">
                  <span className="timeline-time tech-font">Oct 21 14:10 UTC</span>
                  <div className="timeline-text">
                    <strong>Elena Gomez</strong> issued RFQ for SMC pneumatic valve to AutomationDirect.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
