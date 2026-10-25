import React, { useState } from 'react';
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
  ShieldAlert,
  Sparkles,
  PlusCircle,
  Award,
} from 'lucide-react';
import { evaluate15Parameters } from '../data/rankingParameters';

export const ReplacementComparisonPage: React.FC<{ candidateId?: string }> = ({ candidateId = 'part-ifm-igt205' }) => {
  const {
    candidates,
    targetPart,
    navigate,
    setActiveEvidence,
    toggleSavePart,
    isPartSaved,
    addToast,
    evaluateCandidateGuardrails,
  } = useApp();

  const [selectedCandidateId, setSelectedCandidateId] = useState(candidateId);
  const candidate = candidates.find((c) => c.id === selectedCandidateId) || candidates[0];

  const guardResult = evaluateCandidateGuardrails(candidate, 'mach-rf480-line4');
  const isSaved = isPartSaved(candidate.id);

  const [activeViewTab, setActiveViewTab] = useState<'15params' | 'matrix'>('15params');
  const audit15 = evaluate15Parameters(candidate);

  // Group specs by category
  const categories = ['Mechanical', 'Sensing', 'Electrical', 'Environmental'] as const;

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
      <DemoBadge variant="banner" lastChecked="Simulated Engineering Matrix" />

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

      {/* Self-Improving Loop Guardrail Audit Banner */}
      <div className={`compare-guardrail-banner ${guardResult.passed ? 'guard-passed' : 'guard-warning'} mt-4 mb-4`}>
        <div className="banner-content-row">
          <div className="guard-icon-slot">
            {guardResult.passed ? (
              <ShieldCheck size={24} className="text-emerald" />
            ) : (
              <ShieldAlert size={24} className="text-orange" />
            )}
          </div>
          <div className="guard-details-text flex-1">
            <div className="guard-heading-line">
              <span className="guard-heading-strong">
                {guardResult.passed
                  ? 'Self-Improving Loop Verification: Zero Past Incident Risks Detected'
                  : `Self-Improving Guardrail Triggered: ${guardResult.violations[0].guardrailTitle}`}
              </span>
              <span className={`guard-status-pill ${guardResult.passed ? 'pill-teal' : 'pill-orange'}`}>
                {guardResult.passed ? 'PASSED & GUARDED' : guardResult.blocked ? 'REPETITIVE MISTAKE BLOCKED' : 'TOLERANCE REVIEW'}
              </span>
            </div>
            <p className="guard-text-p mt-1">
              {guardResult.passed
                ? (guardResult.verifiedGuards[0]?.benefit || 'This candidate complies with all 5 historical Plant B4 failure guardrails (caustic washdown, barrel depth, polarity).')
                : guardResult.violations[0].warning}
            </p>
          </div>
          <div className="guard-action-slot">
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={() => navigate('/app/learning-loop')}
            >
              <Sparkles size={12} />
              <span>Learning Loop Engine</span>
            </button>
          </div>
        </div>
      </div>

      {/* Side-by-Side Hero Comparison Cards */}
      <div className="compare-hero-cards-grid">
        {/* Original Baseline Card */}
        <div className="hero-part-card original-card">
          <div className="card-ribbon ribbon-neutral">ORIGINAL TARGET BASELINE</div>
          <div className="part-header-info">
            <span className="part-mfg-tag">{targetPart.manufacturer}</span>
            <h3 className="part-number-display tech-font">{targetPart.partNumber}</h3>
            <p className="part-name-display">{targetPart.name}</p>
          </div>
          <div className="part-meta-strip">
            <span className="meta-pill">M18x1.0 Flush</span>
            <span className="meta-pill">Sn = 8.0 mm</span>
            <span className="meta-pill">PNP NO DC</span>
          </div>
          <div className="part-action-row">
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={() => navigate(`/app/parts/${targetPart.id}`)}
            >
              <span>View Baseline Datasheet</span>
            </button>
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
              onClick={() => navigate(`/app/parts/${candidate.id}`)}
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

      {/* View Selector: 15-Parameter Ranking Audit vs Raw Technical Specs */}
      <div className="panel-card mt-6">
        <div className="panel-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="panel-title-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={18} className="text-teal" />
            <h3 className="panel-title">
              {activeViewTab === '15params'
                ? '15 Parameters for Ranking Industrial Parts & Replacements (100% Total Weight)'
                : 'Detailed Parametric Tolerance Table'}
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className={`btn btn-xs ${activeViewTab === '15params' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveViewTab('15params')}
            >
              <Award size={13} />
              <span>15-Parameter Ranking Audit (100%)</span>
            </button>
            <button
              type="button"
              className={`btn btn-xs ${activeViewTab === 'matrix' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveViewTab('matrix')}
            >
              <Scale size={13} />
              <span>Raw Parameter Specs Table</span>
            </button>
          </div>
        </div>

        {activeViewTab === '15params' ? (
          <div style={{ background: 'linear-gradient(145deg, #0b1120 0%, #0f172a 100%)', borderRadius: '14px', border: '1px solid rgba(45, 212, 191, 0.3)', overflow: 'hidden' }}>
            {/* Category Score Highlights */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '0.75rem',
                padding: '1.25rem 1.5rem',
                background: 'rgba(15, 23, 42, 0.85)',
                borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
              }}
            >
              <div style={{ background: 'rgba(20, 184, 166, 0.15)', border: '1px solid #14b8a6', borderRadius: '10px', padding: '0.85rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Total Ranking Score
                </span>
                <strong style={{ fontSize: '1.35rem', color: '#2dd4bf', fontFamily: 'monospace' }}>
                  {audit15.totalScore}% (100 Points Max)
                </strong>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: '10px', padding: '0.85rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Technical & Engineering (46%)
                </span>
                <strong style={{ fontSize: '1.15rem', color: '#5eead4', fontFamily: 'monospace' }}>
                  {audit15.categoryTotals['Technical & Engineering'].points} / 46.0 pts
                </strong>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: '10px', padding: '0.85rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Commercial & Logistics (30%)
                </span>
                <strong style={{ fontSize: '1.15rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                  {audit15.categoryTotals['Commercial & Logistics'].points} / 30.0 pts
                </strong>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: '10px', padding: '0.85rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Data Quality & Provenance (24%)
                </span>
                <strong style={{ fontSize: '1.15rem', color: '#a78bfa', fontFamily: 'monospace' }}>
                  {audit15.categoryTotals['Data Quality & Provenance'].points} / 24.0 pts
                </strong>
              </div>
            </div>

            {/* 15 Parameters Table */}
            <div className="comparison-table-wrapper" style={{ margin: 0, border: 'none', background: 'transparent' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#0F172A', borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                    <th style={{ width: '45px', padding: '1rem', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', fontFamily: 'monospace' }}>#</th>
                    <th style={{ width: '22%', padding: '1rem', color: '#F8FAFC', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'monospace' }}>Parameter</th>
                    <th style={{ width: '10%', padding: '1rem', textAlign: 'center', color: '#F8FAFC', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'monospace' }}>Weight</th>
                    <th style={{ width: '28%', padding: '1rem', color: '#F8FAFC', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'monospace' }}>What We Evaluate</th>
                    <th style={{ width: '14%', padding: '1rem', textAlign: 'right', color: '#F8FAFC', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'monospace' }}>Score & Points</th>
                    <th style={{ width: '24%', padding: '1rem', color: '#F8FAFC', fontSize: '0.78rem', textTransform: 'uppercase', fontFamily: 'monospace' }}>Candidate Finding & Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {audit15.results.map((r, index) => (
                    <tr
                      key={r.parameter.id}
                      style={{
                        background: index % 2 === 0 ? 'rgba(15, 23, 42, 0.85)' : 'rgba(30, 41, 59, 0.6)',
                        borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
                      }}
                    >
                      <td style={{ padding: '1rem', fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
                        #{r.parameter.number}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <strong style={{ color: '#ffffff', fontSize: '0.92rem', display: 'block' }}>{r.parameter.name}</strong>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {r.parameter.category}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span
                          style={{
                            background: 'rgba(13, 148, 136, 0.25)',
                            border: '1px solid #14b8a6',
                            color: '#2dd4bf',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            fontSize: '0.82rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            display: 'inline-block',
                          }}
                        >
                          {r.parameter.weight}%
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: '#cbd5e1', fontSize: '0.84rem', lineHeight: 1.45 }}>
                        {r.parameter.whatWeEvaluate}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <strong style={{ color: '#ffffff', fontFamily: 'monospace', fontSize: '1.05rem', display: 'block' }}>
                          {r.score}%
                        </strong>
                        <span style={{ color: '#2dd4bf', fontSize: '0.78rem', fontWeight: 600 }}>
                          +{r.weightedScore} / {r.parameter.weight} pts
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                        {r.finding}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'rgba(20, 184, 166, 0.2)', fontWeight: 700, borderTop: '2px solid #14b8a6' }}>
                    <td colSpan={2} style={{ padding: '1rem', color: '#ffffff', fontSize: '0.95rem' }}>
                      Total Evaluation Weight
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span
                        style={{
                          background: '#14b8a6',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          fontSize: '0.88rem',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                        }}
                      >
                        100%
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#cbd5e1', fontSize: '0.85rem' }}>
                      Exact sum across all 15 technical, commercial, and provenance ranking parameters.
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <strong style={{ color: '#2dd4bf', fontFamily: 'monospace', fontSize: '1.15rem' }}>
                        {audit15.totalScore} / 100 pts
                      </strong>
                    </td>
                    <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                      Algorithmic Composite Rank
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="comparison-table-wrapper">
            <table className="engineering-table comparison-matrix-table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Technical Requirement</th>
                  <th style={{ width: '22%' }}>Original ({targetPart.partNumber})</th>
                  <th style={{ width: '22%' }}>Candidate ({candidate.partNumber})</th>
                  <th style={{ width: '14%' }}>Result</th>
                  <th style={{ width: '20%' }}>Engineering Explanation & Evidence</th>
                </tr>
              </thead>
              <tbody>
                {candidate.specifications.map((spec, idx) => (
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
        )}
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
