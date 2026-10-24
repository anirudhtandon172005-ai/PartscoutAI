import React from 'react';
import { useApp } from '../context/AppContext';
import { ThreePartViewer } from '../components/ThreePartViewer';
import { DemoBadge } from '../components/DemoBadge';
import {
  Search,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Building,
  Layers,
  Cpu,
  Clock,
  ExternalLink,
  ChevronRight,
  Zap,
  Flame,
  FileCheck,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { navigate, targetPart, candidates, setActiveEvidence } = useApp();
  const sampleCandidate = candidates[0]; // ifm IGT205

  return (
    <div className="landing-page-root">
      {/* Editorial Announcement Strip */}
      <div className="landing-alert-strip">
        <div className="strip-inner">
          <span className="strip-badge">DEMO PROTOTYPE</span>
          <span className="strip-text">
            PartScout AI is an industrial technical intelligence prototype. All inventory, stock, and pricing data shown are realistic engineering illustrations.
          </span>
          <button
            type="button"
            className="strip-link"
            onClick={() => navigate('/app/requests/new/machine')}
          >
            <span>Test the Discovery Flow</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Dark Hero Surface */}
      <section className="hero-dark-surface">
        <div className="container hero-container">
          <div className="hero-content">
            <div className="hero-kicker">
              <span className="kicker-dot"></span>
              <span>ENGINEERING REPLACEMENT INTELLIGENCE FOR FACTORY UPTIME</span>
            </div>

            <h1 className="hero-headline">
              Find drop-in industrial replacements before line downtime costs mount.
            </h1>

            <p className="hero-lead">
              When critical factory machinery fails and OEM parts are backordered for weeks,
              PartScout AI automates technical parameter discovery across trusted industrial distributors,
              compares specifications with deterministic precision, and highlights verified evidence.
            </p>

            <div className="hero-cta-group">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => navigate('/app/requests/new/machine')}
              >
                <span>Start a Part Search</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={() => navigate('/app/compare/part-ifm-igt205')}
              >
                <Scale size={16} />
                <span>View Spec Comparison Matrix</span>
              </button>
            </div>

            <div className="hero-trust-bar">
              <div className="trust-item">
                <span className="trust-val tech-font">400Hz vs 500Hz</span>
                <span className="trust-lbl">Frequency Tolerance Audit</span>
              </div>
              <div className="trust-divider"></div>
              <div className="trust-item">
                <span className="trust-val tech-font">100% Deterministic</span>
                <span className="trust-lbl">No Hallucinated Threads</span>
              </div>
              <div className="trust-divider"></div>
              <div className="trust-item">
                <span className="trust-val tech-font">1-Click Evidence</span>
                <span className="trust-lbl">Primary PDF Datasheet Excerpts</span>
              </div>
            </div>
          </div>

          {/* 3D Component Anchor */}
          <div className="hero-3d-anchor">
            <ThreePartViewer
              partNumber="BES 516-325-G-E5-C-S4"
              manufacturer="M18 Shielded Inductive Sensor (CAD Digital Twin)"
              highlightSpecs={true}
            />
          </div>
        </div>
      </section>

      {/* Warm Parchment Workspace Overview */}
      <section className="workflow-section">
        <div className="container">
          <div className="section-header-block">
            <span className="section-pretitle">RIGOROUS 7-STAGE PIPELINE</span>
            <h2 className="section-title">From machine line-down to verified supplier quote in minutes.</h2>
            <p className="section-desc">
              PartScout AI replaces hours of frantic catalog PDF hunting with structured, evidence-backed engineering discovery.
            </p>
          </div>

          <div className="workflow-grid">
            <div className="workflow-card">
              <div className="step-num tech-font">01</div>
              <h4 className="step-title">Machine Context & Requirement</h4>
              <p className="step-desc">
                Input machine model, mounting line, voltage, thread size, and environmental washdown conditions.
              </p>
              <div className="step-pill">ISO Metric M18x1 • Sn 8mm</div>
            </div>

            <div className="workflow-card">
              <div className="step-num tech-font">02</div>
              <h4 className="step-title">Targeted Source Crawl</h4>
              <p className="step-desc">
                Crawler inspects enabled manufacturer portals and authorized distributor inventories without scraping non-relevant web.
              </p>
              <div className="step-pill">14 Catalog Domains Checked</div>
            </div>

            <div className="workflow-card">
              <div className="step-num tech-font">03</div>
              <h4 className="step-title">Attribute Normalization</h4>
              <p className="step-desc">
                Translates disparate vendor terminology (e.g. "shielded" vs "flush", "PNP make" vs "NO") into unified engineering units.
              </p>
              <div className="step-pill">IEC 60947-5-2 Standardized</div>
            </div>

            <div className="workflow-card">
              <div className="step-num tech-font">04</div>
              <h4 className="step-title">Deterministic Comparison</h4>
              <p className="step-desc">
                Evaluates critical electrical, mechanical, and thermal parameters against original specs. Flags all discrepancies clearly.
              </p>
              <div className="step-pill text-teal">Match • Mismatch • Review</div>
            </div>

            <div className="workflow-card">
              <div className="step-num tech-font">05</div>
              <h4 className="step-title">Source Evidence Citation</h4>
              <p className="step-desc">
                Every technical claim links directly to extracted catalog quotes, revision dates, and PDF datasheets.
              </p>
              <div className="step-pill">Zero Blackbox Claims</div>
            </div>

            <div className="workflow-card">
              <div className="step-num tech-font">06</div>
              <h4 className="step-title">Stock Freshness & Handoff</h4>
              <p className="step-desc">
                Inspect reported stock, lead times, and supplier contact info with clear freshness indicators to finalize procurement.
              </p>
              <div className="step-pill text-amber">Stale Timestamp Warning</div>
            </div>
          </div>
        </div>
      </section>

      {/* Side-by-Side Sample Comparison Preview */}
      <section className="preview-comparison-section">
        <div className="container">
          <div className="comparison-preview-card">
            <div className="preview-header">
              <div>
                <span className="badge-tag live-cad">LIVE COMPARISON PREVIEW</span>
                <h3 className="preview-title">
                  Original Balluff BES 516 vs. Candidate ifm IGT205
                </h3>
                <p className="preview-sub">
                  Sample evaluation for Packaging Line 4 Capper Station (Washdown Zone).
                </p>
              </div>
              <div className="preview-score-badge">
                <span className="score-num tech-font">96%</span>
                <span className="score-label">Drop-in Compatible</span>
              </div>
            </div>

            {/* Side by side mini table */}
            <div className="preview-table-wrapper">
              <table className="engineering-table">
                <thead>
                  <tr>
                    <th>Critical Parameter</th>
                    <th>Original: Balluff BES 516</th>
                    <th>Candidate: ifm efector IGT205</th>
                    <th>Evaluation</th>
                    <th>Audit Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Thread Size & Pitch</strong></td>
                    <td className="tech-font">M18 x 1.0 ISO</td>
                    <td className="tech-font">M18 x 1.0 ISO</td>
                    <td><span className="status-tag status-match"><CheckCircle2 size={12} /> Exact Match</span></td>
                    <td>
                      <button
                        type="button"
                        className="btn-link-action"
                        onClick={() => sampleCandidate.evidence[0] && setActiveEvidence(sampleCandidate.evidence[0])}
                      >
                        <span>Inspect Datasheet</span>
                        <ExternalLink size={11} />
                      </button>
                    </td>
                  </tr>

                  <tr>
                    <td><strong>Sensing Distance (Sn)</strong></td>
                    <td className="tech-font">8.0 mm (Flush)</td>
                    <td className="tech-font">8.0 mm (Flush)</td>
                    <td><span className="status-tag status-match"><CheckCircle2 size={12} /> Exact Match</span></td>
                    <td>
                      <button
                        type="button"
                        className="btn-link-action"
                        onClick={() => sampleCandidate.evidence[0] && setActiveEvidence(sampleCandidate.evidence[0])}
                      >
                        <span>Sn Verified (p. 2)</span>
                        <ExternalLink size={11} />
                      </button>
                    </td>
                  </tr>

                  <tr>
                    <td><strong>Switching Frequency</strong></td>
                    <td className="tech-font">500 Hz</td>
                    <td className="tech-font">400 Hz</td>
                    <td><span className="status-tag status-review"><AlertTriangle size={12} /> Review (400Hz vs 500Hz)</span></td>
                    <td>
                      <span className="text-muted-sm">480 bpm machine speed = 8Hz actual</span>
                    </td>
                  </tr>

                  <tr>
                    <td><strong>Housing Material</strong></td>
                    <td className="tech-font">Nickel-Plated Brass</td>
                    <td className="tech-font">316L Stainless Steel</td>
                    <td><span className="status-tag status-match"><CheckCircle2 size={12} /> Material Upgrade</span></td>
                    <td>
                      <span className="text-muted-sm">Superior CIP resistance</span>
                    </td>
                  </tr>

                  <tr>
                    <td><strong>Enclosure Protection</strong></td>
                    <td className="tech-font">IP67 / IP68</td>
                    <td className="tech-font">IP68 / IP69K (Steam Jet)</td>
                    <td><span className="status-tag status-match"><CheckCircle2 size={12} /> Washdown Compatible</span></td>
                    <td>
                      <button
                        type="button"
                        className="btn-link-action"
                        onClick={() => sampleCandidate.evidence[0] && setActiveEvidence(sampleCandidate.evidence[0])}
                      >
                        <span>DIN 40050-9 Cert</span>
                        <ExternalLink size={11} />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="preview-footer">
              <div className="disclaimer-note">
                <AlertTriangle size={14} className="text-amber" />
                <span>
                  <strong>Important Notice:</strong> Comparison scores reflect algorithmic parameter overlap and evidence citations. They do not constitute official OEM certified equipment interchangeability.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/app/compare/part-ifm-igt205')}
              >
                <span>Open Full Specification Table</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Role-Specific Benefits */}
      <section className="personas-section">
        <div className="container">
          <div className="section-header-block">
            <span className="section-pretitle">TAILORED WORKFLOWS</span>
            <h2 className="section-title">Built for plant maintenance, engineered for procurement.</h2>
          </div>

          <div className="personas-grid">
            <div className="persona-card">
              <div className="persona-icon-box">
                <Cpu size={24} className="text-teal" />
              </div>
              <h3 className="persona-title">Maintenance & Reliability Engineers</h3>
              <ul className="persona-checklist">
                <li><CheckCircle2 size={15} className="text-teal" /> Verify exact electrical output logic (PNP vs NPN, NO vs NC).</li>
                <li><CheckCircle2 size={15} className="text-teal" /> Audit thread pitch, barrel diameter, and rear clearance depths.</li>
                <li><CheckCircle2 size={15} className="text-teal" /> Instant 3D digital twin to visualize mounting nuts & pinouts.</li>
                <li><CheckCircle2 size={15} className="text-teal" /> Record maintenance shift notes directly on investigation items.</li>
              </ul>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => navigate('/app/dashboard')}
              >
                Explore Engineer Workspace
              </button>
            </div>

            <div className="persona-card">
              <div className="persona-icon-box">
                <Building size={24} className="text-primary" />
              </div>
              <h3 className="persona-title">Procurement & Sourcing Specialists</h3>
              <ul className="persona-checklist">
                <li><CheckCircle2 size={15} className="text-teal" /> Real-time aggregator of reported stock across major distributors.</li>
                <li><CheckCircle2 size={15} className="text-teal" /> Surface surplus vs factory-new warranty conditions.</li>
                <li><CheckCircle2 size={15} className="text-teal" /> Automatic warning when inventory timestamps exceed 24 hours.</li>
                <li><CheckCircle2 size={15} className="text-teal" /> Manage RFQs, generate quotation comparison tables, and track POs.</li>
              </ul>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => navigate('/app/quotes')}
              >
                Explore Procurement Suite
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="landing-bottom-cta">
        <div className="container text-center">
          <h2 className="bottom-headline">Test PartScout AI with the Packaging Line 4 scenario.</h2>
          <p className="bottom-sub">
            Experience the complete flow from machine definition through crawler simulation to quotation handoff.
          </p>
          <div className="bottom-btn-group">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/app/requests/new/machine')}
            >
              <span>Launch Prototype Search</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              onClick={() => navigate('/login')}
            >
              <span>Sign In with Demo Role</span>
            </button>
          </div>
          <div className="prototype-footer-note">
            <DemoBadge variant="inline" customText="Demo Environment" lastChecked="Simulated State" />
            <span className="footer-disclaimer-text">
              Prototype designed for industrial evaluation. No external backend or live web-crawling active without explicit credential configuration.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
