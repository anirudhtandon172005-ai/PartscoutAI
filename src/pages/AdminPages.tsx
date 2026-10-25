import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DemoBadge } from '../components/DemoBadge';
import {
  Globe2,
  Activity,
  Database,
  Building2,
  ShieldAlert,
  Users2,
  KeyRound,
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  RotateCcw,
  Clock,
  Eye,
  Sliders,
  Save,
  X,
  FileCheck2,
} from 'lucide-react';
import { DEMO_ADMIN_METRICS } from '../data/mockData';
import { triggerPartScrape, SPECIFIC_INDUSTRIAL_SOURCES } from '../api/crawler';

interface AdminViewProps {
  subpage: 'dashboard' | 'sources' | 'jobs' | 'products' | 'suppliers' | 'quality' | 'users' | 'settings';
}

export const AdminPages: React.FC<AdminViewProps> = ({ subpage }) => {
  const {
    sourceDomains,
    toggleSourceDomain,
    addSourceDomain,
    collectionJobs,
    qualityIssues,
    resolveQualityIssue,
    allParts,
    suppliers,
    navigate,
    addToast,
    guardrails,
    totalMistakesPrevented,
  } = useApp();

  // Add source modal state
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceDomain, setNewSourceDomain] = useState('');
  const [newSourceCategory, setNewSourceCategory] = useState<'Manufacturer Portal' | 'Major Distributor' | 'Regional Stockist'>('Major Distributor');
  const [newSourceFrequency, setNewSourceFrequency] = useState<'Hourly' | 'Daily' | 'Weekly'>('Daily');

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceDomain.trim()) return;
    addSourceDomain({
      name: newSourceName.trim(),
      domain: newSourceDomain.trim().toLowerCase(),
      category: newSourceCategory,
      enabled: true,
      crawlFrequency: newSourceFrequency,
      notes: 'Manually added target domain in prototype registry.',
    });
    setShowAddSourceModal(false);
    setNewSourceName('');
    setNewSourceDomain('');
  };

  // TinyFish Live Scraping State
  const [liveScrapeUrl, setLiveScrapeUrl] = useState('https://www.ifm.com/product/IGT205');
  const [liveScrapePartNum, setLiveScrapePartNum] = useState('IGT205');
  const [scrapingInProgress, setScrapingInProgress] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<any | null>(null);

  const handleRunLiveScrape = async () => {
    if (!liveScrapeUrl.trim()) return;
    setScrapingInProgress(true);
    setScrapeResult(null);
    try {
      const parsedHost = new URL(liveScrapeUrl).hostname;
      addToast('TinyFish Agent Dispatched', `Crawling ${parsedHost}...`, 'info');
    } catch {
      addToast('TinyFish Agent Dispatched', 'Crawling target supplier URL...', 'info');
    }

    try {
      const res = await triggerPartScrape({
        url: liveScrapeUrl.trim(),
        part_number: liveScrapePartNum.trim() || undefined,
      });
      setScrapeResult(res);
      if (res.success) {
        addToast('Scraping Complete', `Extracted catalog data using TinyFish in ${res.num_of_steps || 4} steps.`, 'success');
      } else {
        addToast('Scraping Notice', res.error || 'Check target supplier URL.', 'warning');
      }
    } catch (e: any) {
      setScrapeResult({ success: false, error: e?.message });
      addToast('Scraping Error', e?.message || 'TinyFish service error', 'warning');
    } finally {
      setScrapingInProgress(false);
    }
  };

  // API Settings State
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(60);

  const pendingIssues = qualityIssues.filter((q) => !q.resolved);

  return (
    <div className="admin-page-root">
      {/* Top Banner Notice */}
      <DemoBadge variant="banner" lastChecked="Admin Control Environment" />

      {/* Admin Title Header */}
      <div className="admin-header-row">
        <div>
          <div className="kicker-line">
            <span className="badge-tag live-cad">SYSTEM ADMINISTRATION & CATALOG CRAWLER</span>
            <span className="text-muted-xs">Role: Enterprise Administrator</span>
          </div>
          <h1 className="admin-title">
            {subpage === 'dashboard' && 'Admin Overview & System Health'}
            {subpage === 'sources' && 'Targeted Website Source Registry'}
            {subpage === 'jobs' && 'Collection Monitor & Extraction Workers'}
            {subpage === 'products' && 'Product Catalog Master Records'}
            {subpage === 'suppliers' && 'Supplier Entity Attribution'}
            {subpage === 'quality' && 'Data Quality & Validation Audit'}
            {subpage === 'users' && 'User & Role Access Management'}
            {subpage === 'settings' && 'API Integration & Service Settings'}
          </h1>
          <p className="admin-sub">
            Configure targeted catalog domains, inspect collection logs, resolve specification conflicts, and audit crawler health.
          </p>
        </div>

        {subpage === 'sources' && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAddSourceModal(true)}
          >
            <PlusCircle size={16} />
            <span>Add Target Domain</span>
          </button>
        )}
      </div>

      {/* ================= 1. ADMIN DASHBOARD ================= */}
      {subpage === 'dashboard' && (
        <div className="admin-dashboard-view">
          {/* Admin Metric Cards */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-label">Indexed Components</span>
                <Database size={18} className="text-teal" />
              </div>
              <div className="metric-body">
                <span className="metric-value tech-font">{DEMO_ADMIN_METRICS.indexedComponents.toLocaleString()}</span>
                <span className="metric-unit">Products</span>
              </div>
              <div className="metric-footer">
                <span className="footer-tag tag-teal">IEC Normalized</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-label">Targeted Source Domains</span>
                <Globe2 size={18} className="text-primary" />
              </div>
              <div className="metric-body">
                <span className="metric-value tech-font">{sourceDomains.length}</span>
                <span className="metric-unit">Active Sources</span>
              </div>
              <div className="metric-footer">
                <span className="footer-tag tag-neutral">{sourceDomains.filter((s) => s.enabled).length} Enabled</span>
              </div>
            </div>

            <div className="metric-card urgent-card">
              <div className="metric-header">
                <span className="metric-label">Data Quality Flags</span>
                <ShieldAlert size={18} className="text-orange" />
              </div>
              <div className="metric-body">
                <span className="metric-value tech-font">{pendingIssues.length}</span>
                <span className="metric-unit">Need Review</span>
              </div>
              <div className="metric-footer">
                <button
                  type="button"
                  className="metric-link-btn"
                  onClick={() => navigate('/admin/quality')}
                >
                  Resolve Flags
                </button>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-label">Avg Discovery Latency</span>
                <Activity size={18} className="text-teal" />
              </div>
              <div className="metric-body">
                <span className="metric-value tech-font">{DEMO_ADMIN_METRICS.averageSearchDurationSeconds}s</span>
                <span className="metric-unit">Per Query</span>
              </div>
              <div className="metric-footer">
                <span className="footer-tag tag-teal">High Confidence: 94.2%</span>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts to Admin Areas */}
          <div className="admin-shortcuts-grid mt-6">
            <div className="shortcut-card" onClick={() => navigate('/admin/sources')}>
              <Globe2 size={24} className="text-teal" />
              <h4>Website Source Manager</h4>
              <p>Add, disable, or adjust crawl frequencies for manufacturer and distributor domains.</p>
            </div>

            <div className="shortcut-card" onClick={() => navigate('/admin/jobs')}>
              <Activity size={24} className="text-primary" />
              <h4>Collection Monitor</h4>
              <p>Review background collection worker queues, extraction rates, retries, and HTTP logs.</p>
            </div>

            <div className="shortcut-card" onClick={() => navigate('/admin/quality')}>
              <ShieldAlert size={24} className="text-orange" />
              <h4>Data Quality & Validation</h4>
              <p>Resolve conflicting spec claims, stale inventory timestamps, and missing parameter values.</p>
            </div>

            <div className="shortcut-card" onClick={() => navigate('/admin/settings')}>
              <KeyRound size={24} className="text-teal" />
              <h4>API & System Settings</h4>
              <p>Service boundary configurations, masked credentials, and crawler rate-limiting controls.</p>
            </div>
          </div>
        </div>
      )}

      {/* ================= 2. WEBSITE SOURCE MANAGEMENT ================= */}
      {subpage === 'sources' && (
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title-group">
              <Globe2 size={18} className="text-teal" />
              <h3 className="panel-title">Targeted Source Domains ({sourceDomains.length})</h3>
            </div>
            <DemoBadge variant="inline" customText="Crawler Registry" lastChecked="Live State" />
          </div>

          <div className="admin-table-wrapper">
            <table className="engineering-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Domain & Name</th>
                  <th>Category</th>
                  <th>Crawl Schedule</th>
                  <th>Extracted Records</th>
                  <th>Last Run Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sourceDomains.map((src) => (
                  <tr key={src.id} className={!src.enabled ? 'row-disabled' : ''}>
                    <td>
                      <button
                        type="button"
                        className="btn-toggle-switch"
                        onClick={() => toggleSourceDomain(src.id)}
                        title={src.enabled ? 'Disable source domain' : 'Enable source domain'}
                      >
                        {src.enabled ? (
                          <ToggleRight size={26} className="text-teal" />
                        ) : (
                          <ToggleLeft size={26} className="text-muted" />
                        )}
                      </button>
                    </td>
                    <td>
                      <div className="font-semibold">{src.name}</div>
                      <span className="tech-font text-muted-xs">{src.domain}</span>
                    </td>
                    <td>
                      <span className="source-category-pill">{src.category}</span>
                    </td>
                    <td>
                      <span className="tech-font">{src.crawlFrequency}</span>
                      <div className="text-muted-xs">{src.lastCrawlTime}</div>
                    </td>
                    <td>
                      <span className="tech-font font-medium">
                        {src.extractedProductsCount.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          src.lastCrawlStatus === 'Success'
                            ? 'status-pill-teal'
                            : 'status-pill-amber'
                        }`}
                      >
                        {src.lastCrawlStatus}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        onClick={() => toggleSourceDomain(src.id)}
                      >
                        <span>{src.enabled ? 'Pause' : 'Activate'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 3. COLLECTION MONITOR ================= */}
      {subpage === 'jobs' && (
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title-group">
              <Activity size={18} className="text-teal" />
              <h3 className="panel-title">Background Extraction Workers (Illustrative Monitor)</h3>
            </div>
            <DemoBadge variant="inline" customText="TinyFish Engine Active" lastChecked="Live AI Scraping" />
          </div>

          <div className="admin-disclaimer-note" style={{ background: 'rgba(13, 148, 136, 0.1)', borderColor: 'rgba(13, 148, 136, 0.3)' }}>
            <CheckCircle2 size={15} className="text-teal" />
            <span>
              <strong>TinyFish Web Agent Active:</strong> Autonomous data extraction engine connected using authenticated API key (<code>sk-tinyfish-RqCF...6v0</code>). Supports dynamic JavaScript rendering, supplier catalog parsing, and automated spec extraction.
            </span>
          </div>

          <div className="admin-table-wrapper mt-4">
            <table className="engineering-table">
              <thead>
                <tr>
                  <th>Job ID & Name</th>
                  <th>Target Domain</th>
                  <th>Status</th>
                  <th>Records Extracted</th>
                  <th>Duration</th>
                  <th>Retries</th>
                  <th>Execution Window</th>
                </tr>
              </thead>
              <tbody>
                {collectionJobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <div className="font-semibold">{job.jobName}</div>
                      <span className="tech-font text-muted-xs">{job.id}</span>
                      {job.errorMessage && (
                        <div className="job-err-msg mt-1 text-orange text-xs">{job.errorMessage}</div>
                      )}
                    </td>
                    <td>
                      <span className="tech-font font-medium">{job.domain}</span>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          job.status === 'Completed'
                            ? 'status-pill-teal'
                            : job.status === 'Failed'
                            ? 'status-pill-amber'
                            : 'status-pill-neutral'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td>
                      <span className="tech-font font-bold">{job.recordsExtracted}</span>
                    </td>
                    <td>
                      <span className="tech-font">{job.durationSeconds}s</span>
                    </td>
                    <td>
                      <span className="tech-font">{job.retries}</span>
                    </td>
                    <td>
                      <div className="tech-font text-muted-xs">{job.startedAt}</div>
                      <div className="tech-font text-muted-xs">{job.completedAt || 'In progress'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 4. PRODUCT DATA MANAGEMENT ================= */}
      {subpage === 'products' && (
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title-group">
              <Database size={18} className="text-teal" />
              <h3 className="panel-title">Master Product Records Catalog ({allParts.length})</h3>
            </div>
          </div>

          <div className="admin-table-wrapper">
            <table className="engineering-table">
              <thead>
                <tr>
                  <th>Part Number</th>
                  <th>Manufacturer</th>
                  <th>Category</th>
                  <th>Sensing Range (Sn)</th>
                  <th>Thread Size</th>
                  <th>Verified Offers</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allParts.map((part) => (
                  <tr key={part.id}>
                    <td>
                      <strong className="tech-font text-primary">{part.partNumber}</strong>
                      <div className="text-muted-xs">{part.name}</div>
                    </td>
                    <td>{part.manufacturer}</td>
                    <td>{part.category}</td>
                    <td>
                      <span className="tech-font text-teal">{part.keySpecs['Sensing Distance (Sn)']}</span>
                    </td>
                    <td>
                      <span className="tech-font">{part.keySpecs['Thread Size']}</span>
                    </td>
                    <td>
                      <span className="tech-font font-medium">{part.offers.length} active listings</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        onClick={() => navigate(`/app/parts/${part.id}`)}
                      >
                        Inspect Record
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 5. SUPPLIER DATA MANAGEMENT ================= */}
      {subpage === 'suppliers' && (
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title-group">
              <Building2 size={18} className="text-teal" />
              <h3 className="panel-title">Supplier Master Attribution Records</h3>
            </div>
          </div>

          <div className="admin-table-wrapper">
            <table className="engineering-table">
              <thead>
                <tr>
                  <th>Supplier Entity</th>
                  <th>Domain</th>
                  <th>Type</th>
                  <th>Country & HQ</th>
                  <th>Partner State</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supp) => (
                  <tr key={supp.id}>
                    <td>
                      <strong>{supp.name}</strong>
                      <div className="text-muted-xs">{supp.id}</div>
                    </td>
                    <td className="tech-font">{supp.domain}</td>
                    <td>{supp.type}</td>
                    <td>{supp.headquarters} ({supp.country})</td>
                    <td>
                      {supp.verifiedPartner ? (
                        <span className="status-pill status-pill-teal">Franchised Partner</span>
                      ) : (
                        <span className="status-pill status-pill-neutral">Public Index</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        onClick={() => navigate(`/app/suppliers/${supp.id}`)}
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 6. DATA QUALITY & VALIDATION ================= */}
      {subpage === 'quality' && (
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title-group">
              <ShieldAlert size={18} className="text-orange" />
              <h3 className="panel-title">Data Quality Flags & Conflict Resolver</h3>
            </div>
            <span className="counter-badge">{pendingIssues.length} Unresolved Discrepancies</span>
          </div>

          <div className="admin-table-wrapper">
            <table className="engineering-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Issue Type</th>
                  <th>Component Affected</th>
                  <th>Discrepancy Description</th>
                  <th>Sources Involved</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {qualityIssues.map((issue) => (
                  <tr key={issue.id} className={issue.resolved ? 'row-resolved' : ''}>
                    <td>
                      <span
                        className={`criticality-badge ${
                          issue.severity === 'High' ? 'crit-high' : issue.severity === 'Medium' ? 'crit-medium' : 'crit-low'
                        }`}
                      >
                        {issue.severity}
                      </span>
                    </td>
                    <td>
                      <strong>{issue.type}</strong>
                      <div className="text-muted-xs tech-font">{issue.detectedAt}</div>
                    </td>
                    <td>
                      <span className="tech-font font-semibold text-primary">{issue.partNumber}</span>
                    </td>
                    <td>{issue.description}</td>
                    <td>
                      <div className="tech-font text-muted-xs">{issue.sources.join(', ')}</div>
                    </td>
                    <td>
                      {!issue.resolved ? (
                        <button
                          type="button"
                          className="btn btn-primary btn-xs"
                          onClick={() => resolveQualityIssue(issue.id)}
                        >
                          <CheckCircle2 size={12} />
                          <span>Mark Resolved</span>
                        </button>
                      ) : (
                        <span className="status-tag status-match">
                          <CheckCircle2 size={12} /> Resolved
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Self-Improving Loop Integration Card */}
          <div className="panel-footer-disclaimer mt-4 flex-between">
            <div className="flex-start-gap">
              <FileCheck2 size={16} className="text-teal" />
              <div>
                <strong>Self-Improving Closed Loop Active:</strong> Resolved discrepancies and field fitment rejections automatically synthesize into <strong>{guardrails.length} active constraint guardrails</strong>, preventing {totalMistakesPrevented} repeat machine failures.
              </div>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={() => navigate('/admin/learning-loop')}
            >
              <span>Manage Learning Loop ({guardrails.length})</span>
              <ExternalLink size={11} />
            </button>
          </div>
        </div>
      )}

      {/* ================= 7. USER MANAGEMENT ================= */}
      {subpage === 'users' && (
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title-group">
              <Users2 size={18} className="text-teal" />
              <h3 className="panel-title">Facility Team & Role Access (Demo Roster)</h3>
            </div>
            <DemoBadge variant="inline" customText="Demo User Table" lastChecked="Sandbox State" />
          </div>

          <div className="admin-table-wrapper">
            <table className="engineering-table">
              <thead>
                <tr>
                  <th>User & Email</th>
                  <th>Role Title</th>
                  <th>Plant Location</th>
                  <th>Sourcing Permissions</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Marcus Vance</strong>
                    <div className="text-muted-xs tech-font">m.vance@apexpack.internal</div>
                  </td>
                  <td>Lead Maintenance Engineer</td>
                  <td>Bottling Lines 1-4</td>
                  <td>Submit Requests, Evaluate Specs, Save Parts</td>
                  <td><span className="status-pill status-pill-teal">Active</span></td>
                </tr>
                <tr>
                  <td>
                    <strong>Elena Gomez</strong>
                    <div className="text-muted-xs tech-font">e.gomez@apexpack.internal</div>
                  </td>
                  <td>Senior Procurement Specialist</td>
                  <td>Plant Procurement Office</td>
                  <td>Issue RFQs, Manage Quotes, Track POs</td>
                  <td><span className="status-pill status-pill-teal">Active</span></td>
                </tr>
                <tr>
                  <td>
                    <strong>Sarah Jenkins</strong>
                    <div className="text-muted-xs tech-font">s.jenkins@apexpack.internal</div>
                  </td>
                  <td>Enterprise Systems Administrator</td>
                  <td>Central Engineering Hub</td>
                  <td>Full Admin, Crawler Config, Source Registry</td>
                  <td><span className="status-pill status-pill-teal">Active (Admin)</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 8. API & SYSTEM SETTINGS ================= */}
      {subpage === 'settings' && (
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title-group">
              <KeyRound size={18} className="text-teal" />
              <h3 className="panel-title">API Gateways & Service Boundaries</h3>
            </div>
            <DemoBadge variant="inline" customText="Masked Placeholders" lastChecked="Local Only" />
          </div>

          <div className="settings-fields-stack">
            <div className="admin-disclaimer-note" style={{ background: 'rgba(13, 148, 136, 0.1)', borderColor: 'rgba(13, 148, 136, 0.3)' }}>
              <CheckCircle2 size={16} className="text-teal" />
              <span>
                <strong>TinyFish Web Agent Active:</strong> Autonomous data extraction engine connected using authenticated API key (<code className="tech-font">sk-tinyfish-RqCF...6v0</code>). Supports dynamic JavaScript rendering, supplier catalog parsing, and automated spec extraction.
              </span>
            </div>

            <div className="form-group mt-4">
              <label className="form-label">Web Scraping Engine Provider</label>
              <input
                type="text"
                className="form-input tech-font"
                value="TinyFish Web Agent Engine (https://agent.tinyfish.ai/v1)"
                readOnly
              />
              <span className="field-hint">
                Autonomous AI crawler configured via backend service and Vite environment variables.
              </span>
            </div>

            <div className="form-group mt-4">
              <label className="form-label">TinyFish Scraper API Credential (Masked)</label>
              <input
                type="text"
                className="form-input tech-font"
                value="sk-tinyfish-RqCF••••••••••••••••••••••••6v0 (Active)"
                readOnly
              />
            </div>

            {/* Live Interactive TinyFish Scraper Tool */}
            <div className="mt-5 p-4 rounded-xl border border-teal-500/20 bg-slate-900/40" style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(13, 148, 136, 0.25)', borderRadius: '12px', padding: '1.25rem' }}>
              <div className="flex items-center gap-2 mb-3">
                <Globe2 size={17} className="text-teal" />
                <h4 className="text-white font-semibold text-sm m-0">Live Autonomous Supplier Scrape (TinyFish Agent)</h4>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Dispatch an autonomous headless browser agent to navigate any distributor or manufacturer product page and extract real-time technical specs, pricing, and inventory.
              </p>

              <div className="mb-3">
                <span className="text-xs text-slate-300 font-medium block mb-1">
                  Target Specific Whitelisted Industrial Sites (Prevents General Web Crawl Errors):
                </span>
                <div className="flex flex-wrap gap-1">
                  {SPECIFIC_INDUSTRIAL_SOURCES.map((source) => (
                    <button
                      key={source.id}
                      type="button"
                      className="btn btn-xs btn-outline"
                      style={{ fontSize: '11px', padding: '2px 8px' }}
                      onClick={() => {
                        const targetUrl = source.url_template.replace('{part_number}', encodeURIComponent(liveScrapePartNum || 'IGT205'));
                        setLiveScrapeUrl(targetUrl);
                      }}
                      title={`Target ${source.name} catalog`}
                    >
                      {source.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group col-6">
                  <label className="form-label text-xs">Target Supplier URL</label>
                  <input
                    type="url"
                    className="form-input tech-font text-xs"
                    placeholder="https://www.ifm.com/product/IGT205"
                    value={liveScrapeUrl}
                    onChange={(e) => setLiveScrapeUrl(e.target.value)}
                  />
                </div>
                <div className="form-group col-6">
                  <label className="form-label text-xs">Target Part Number</label>
                  <input
                    type="text"
                    className="form-input tech-font text-xs"
                    placeholder="e.g. IGT205"
                    value={liveScrapePartNum}
                    onChange={(e) => {
                      const newPart = e.target.value;
                      setLiveScrapePartNum(newPart);
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                className="btn btn-outline btn-sm mt-3"
                disabled={scrapingInProgress || !liveScrapeUrl.trim()}
                onClick={handleRunLiveScrape}
              >
                {scrapingInProgress ? (
                  <>
                    <RotateCcw size={13} className="spin" />
                    <span>TinyFish Agent Scraping in Progress...</span>
                  </>
                ) : (
                  <>
                    <ExternalLink size={13} />
                    <span>Trigger Live TinyFish Extraction</span>
                  </>
                )}
              </button>

              {scrapeResult && (
                <div className="mt-3 p-3 rounded bg-black/40 border border-slate-700 text-xs font-mono" style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '8px', padding: '0.85rem', marginTop: '0.85rem' }}>
                  <div className="flex justify-between items-center mb-1 text-teal font-semibold">
                    <span>STATUS: {scrapeResult.status || (scrapeResult.success ? 'COMPLETED' : 'FAILED')}</span>
                    {scrapeResult.run_id && <span className="text-slate-500">Run: {scrapeResult.run_id.slice(0, 12)}...</span>}
                  </div>
                  <pre className="text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-48 m-0">
                    {JSON.stringify(scrapeResult.result || scrapeResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="form-group mt-4">
              <label className="form-label">
                Crawler Polite Request Throttling: <strong>{rateLimitPerMinute} requests / minute</strong>
              </label>
              <input
                type="range"
                min="10"
                max="120"
                value={rateLimitPerMinute}
                onChange={(e) => setRateLimitPerMinute(Number(e.target.value))}
                className="form-range"
              />
              <span className="field-hint">
                Controls rate-limiting delays to respect robots.txt rules on targeted manufacturer portals.
              </span>
            </div>

            <button
              type="button"
              className="btn btn-primary mt-4"
              onClick={() => addToast('Config Saved', 'TinyFish crawler configuration and throttle rate updated.', 'success')}
            >
              <Save size={15} />
              <span>Save System Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Source Domain Modal */}
      {showAddSourceModal && (
        <div className="modal-overlay" onClick={() => setShowAddSourceModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Targeted Catalog Domain</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAddSourceModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSource} className="modal-body">
              <div className="form-group">
                <label className="form-label">Target Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Omron Automation Portal"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Domain Name *</label>
                <input
                  type="text"
                  className="form-input tech-font"
                  placeholder="e.g. omron.com"
                  value={newSourceDomain}
                  onChange={(e) => setNewSourceDomain(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group col-6">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={newSourceCategory}
                    onChange={(e) => setNewSourceCategory(e.target.value as any)}
                  >
                    <option value="Manufacturer Portal">Manufacturer Portal</option>
                    <option value="Major Distributor">Major Distributor</option>
                    <option value="Regional Stockist">Regional Stockist</option>
                  </select>
                </div>

                <div className="form-group col-6">
                  <label className="form-label">Crawl Frequency</label>
                  <select
                    className="form-select"
                    value={newSourceFrequency}
                    onChange={(e) => setNewSourceFrequency(e.target.value as any)}
                  >
                    <option value="Hourly">Hourly</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowAddSourceModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <span>Register Domain</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
