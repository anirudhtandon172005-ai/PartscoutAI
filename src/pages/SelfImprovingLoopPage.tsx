import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DemoBadge } from '../components/DemoBadge';
import {
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Sliders,
  Cpu,
  Layers,
  ArrowRight,
  Flame,
  X,
  Sparkles,
  HelpCircle,
  Scale,
  Building2,
  Clock,
  Play
} from 'lucide-react';
import { LearnedGuardrail, PastMistakeIncident, ComponentItem } from '../types';

export const SelfImprovingLoopPage: React.FC = () => {
  const {
    guardrails,
    pastMistakes,
    toggleGuardrail,
    logPastMistake,
    resetGuardrailsToDefault,
    evaluateCandidateGuardrails,
    totalMistakesPrevented,
    machines,
    allParts,
    candidates,
    targetPart,
    navigate,
    addToast,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showLogModal, setShowLogModal] = useState<boolean>(false);

  // New mistake form state
  const [formData, setFormData] = useState({
    machineId: 'mach-rf480-line4',
    partNumber: '',
    manufacturer: '',
    mistakeType: '',
    severity: 'High' as PastMistakeIncident['severity'],
    failureDescription: '',
    rootCause: '',
    preventionAction: '',
    ruleTitle: '',
    ruleCondition: '',
    category: 'Environmental Washdown' as LearnedGuardrail['category'],
    blockPart: true,
    penaltyPoints: 30,
  });

  // Simulator test state
  const [simMachineId, setSimMachineId] = useState<string>('mach-rf480-line4');
  const [simPartId, setSimPartId] = useState<string>('part-pf-nbb8');
  const [simResult, setSimResult] = useState<ReturnType<typeof evaluateCandidateGuardrails> | null>(null);

  const filteredGuardrails =
    selectedCategory === 'All'
      ? guardrails
      : guardrails.filter((g) => g.category === selectedCategory);

  const activeRulesCount = guardrails.filter((g) => g.active).length;

  const handleRunSimulator = () => {
    const part = allParts.find((p) => p.id === simPartId) || candidates[0];
    const res = evaluateCandidateGuardrails(part, simMachineId);
    setSimResult(res);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partNumber.trim() || !formData.ruleTitle.trim() || !formData.failureDescription.trim()) {
      addToast('Validation Error', 'Please fill in the required part number, failure description, and rule title.', 'warning');
      return;
    }

    const machine = machines.find((m) => m.id === formData.machineId);

    logPastMistake({
      machineId: formData.machineId,
      machineName: machine ? `${machine.model} (${machine.productionLine})` : 'General Facility Asset',
      partNumber: formData.partNumber.trim(),
      manufacturer: formData.manufacturer.trim() || 'Third-Party OEM',
      mistakeType: formData.mistakeType.trim() || 'Fitment / Environmental Failure',
      severity: formData.severity,
      failureDescription: formData.failureDescription.trim(),
      rootCause: formData.rootCause.trim() || 'Specification conflict not caught in generic catalog search.',
      preventionAction: formData.preventionAction.trim() || `Synthesised automated guardrail rule: ${formData.ruleTitle}`,
      ruleTitle: formData.ruleTitle.trim(),
      ruleCondition: formData.ruleCondition.trim() || `IF machine matches ${machine?.model}, reject incompatible spec.`,
      category: formData.category,
      blockPart: formData.blockPart,
      penaltyPoints: Number(formData.penaltyPoints) || 25,
    });

    setShowLogModal(false);
    setFormData({
      machineId: 'mach-rf480-line4',
      partNumber: '',
      manufacturer: '',
      mistakeType: '',
      severity: 'High',
      failureDescription: '',
      rootCause: '',
      preventionAction: '',
      ruleTitle: '',
      ruleCondition: '',
      category: 'Environmental Washdown',
      blockPart: true,
      penaltyPoints: 30,
    });
  };

  return (
    <div className="self-improving-page-root">
      {/* Top Banner Notice */}
      <DemoBadge variant="banner" lastChecked="Self-Improving Loop Active" />

      {/* Main Header */}
      <div className="admin-header-row">
        <div>
          <div className="kicker-line">
            <span className="badge-tag live-cad">CLOSED-LOOP DETERMINISTIC AI LEARNING</span>
            <span className="text-muted-xs">Plant B4 Knowledge Base</span>
          </div>
          <h1 className="admin-title">Self-Improving Engine & Past Mistake Guardrails</h1>
          <p className="admin-sub">
            PartScout AI learns continuously from past field fitment failures, washdown damage, and supplier stockouts, automatically synthesizing guardrails so the system <strong>never repeats a mistake</strong>.
          </p>
        </div>

        <div className="header-actions-group">
          <button
            type="button"
            className="btn btn-outline"
            onClick={resetGuardrailsToDefault}
            title="Reset to factory benchmark guardrails"
          >
            <RotateCcw size={15} />
            <span>Reset Benchmarks</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowLogModal(true)}
          >
            <PlusCircle size={16} />
            <span>Log Field Mistake / Teach Engine</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Metrics */}
      <div className="admin-kpi-grid mt-6">
        <div className="admin-kpi-card">
          <div className="kpi-icon-slot bg-emerald-dim">
            <ShieldCheck size={22} className="text-teal" />
          </div>
          <div className="kpi-meta">
            <span className="kpi-label">Active Guardrails</span>
            <div className="kpi-val text-teal">
              {activeRulesCount} <span className="kpi-subval">/ {guardrails.length} Rules</span>
            </div>
            <span className="kpi-subtext">Active constraint enforcement</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-icon-slot bg-amber-dim">
            <ShieldAlert size={22} className="text-orange" />
          </div>
          <div className="kpi-meta">
            <span className="kpi-label">Mistakes Prevented</span>
            <div className="kpi-val text-orange">
              {totalMistakesPrevented}{' '}
              <span className="kpi-subval">Repeat Errors Blocked</span>
            </div>
            <span className="kpi-subtext">Cumulative line-down savings</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-icon-slot bg-cyan-dim">
            <Building2 size={22} className="text-cyan" />
          </div>
          <div className="kpi-meta">
            <span className="kpi-label">Protected Assets</span>
            <div className="kpi-val text-cyan">
              {machines.length} <span className="kpi-subval">Production Lines</span>
            </div>
            <span className="kpi-subtext">Krones, KUKA & Battenfeld lines</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-icon-slot bg-purple-dim">
            <Sparkles size={22} className="text-purple" />
          </div>
          <div className="kpi-meta">
            <span className="kpi-label">Repeat Incident Rate</span>
            <div className="kpi-val text-purple">
              0.0% <span className="kpi-subval">Guarded</span>
            </div>
            <span className="kpi-subtext">Zero recurrence after guard synthesis</span>
          </div>
        </div>
      </div>

      {/* Visual Architecture: How The Loop Operates */}
      <div className="panel-card mt-6">
        <div className="panel-header">
          <div className="panel-title-group">
            <Activity size={18} className="text-teal" />
            <h3 className="panel-title">Self-Improving Loop Architecture: Continuous Industrial Learning</h3>
          </div>
          <span className="badge-tag live-cad">LIVE CLOSED-LOOP PIPELINE</span>
        </div>
        <div className="panel-body">
          <div className="loop-architecture-grid">
            <div className="loop-step-card">
              <div className="loop-step-num">01</div>
              <div className="loop-step-icon">
                <AlertTriangle size={20} className="text-amber" />
              </div>
              <h4 className="loop-step-title">1. Field Experience & Rejection</h4>
              <p className="loop-step-desc">
                When maintenance or procurement reports an issue (washdown ingress, short thread, or ghost stock), the incident is recorded with root cause telemetry.
              </p>
            </div>

            <div className="loop-arrow-slot">
              <ArrowRight size={20} className="text-teal" />
            </div>

            <div className="loop-step-card">
              <div className="loop-step-num">02</div>
              <div className="loop-step-icon">
                <Cpu size={20} className="text-teal" />
              </div>
              <h4 className="loop-step-title">2. Root Cause Audit & IEC Mapping</h4>
              <p className="loop-step-desc">
                The engine isolates the exact parameter mismatch (e.g. IP67 vs IP69K, barrel length &lt; 42mm, NPN polarity) against standard IEC 60947-5-2 attributes.
              </p>
            </div>

            <div className="loop-arrow-slot">
              <ArrowRight size={20} className="text-teal" />
            </div>

            <div className="loop-step-card">
              <div className="loop-step-num">03</div>
              <div className="loop-step-icon">
                <Sliders size={20} className="text-orange" />
              </div>
              <h4 className="loop-step-title">3. Automated Guardrail Synthesis</h4>
              <p className="loop-step-desc">
                A deterministic guardrail rule is generated and committed to memory. The rule targets the machine category with strict penalty points or auto-block rules.
              </p>
            </div>

            <div className="loop-arrow-slot">
              <ArrowRight size={20} className="text-teal" />
            </div>

            <div className="loop-step-card loop-step-highlight">
              <div className="loop-step-num">04</div>
              <div className="loop-step-icon">
                <ShieldCheck size={20} className="text-emerald" />
              </div>
              <h4 className="loop-step-title">4. Preemptive Search Shield</h4>
              <p className="loop-step-desc">
                In all future searches, candidates are screened against the guardrail. Any component matching the past failure is intercepted before a purchase order is issued!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Guardrail Simulator */}
      <div className="panel-card mt-6">
        <div className="panel-header">
          <div className="panel-title-group">
            <Play size={18} className="text-teal" />
            <h3 className="panel-title">Interactive Guardrail Test Simulator</h3>
          </div>
          <span className="text-muted-xs">Test how PartScout AI intercepts past mistakes in real-time</span>
        </div>
        <div className="panel-body">
          <p className="text-sm text-muted">
            Select a target production asset and candidate component below to simulate how the Self-Improving Guardrails screen specifications before recommendations are presented:
          </p>

          <div className="simulator-controls-row mt-4">
            <div className="form-group flex-1">
              <label className="form-label" htmlFor="sim-machine-select">Target Machine / Asset:</label>
              <select
                id="sim-machine-select"
                className="form-select"
                value={simMachineId}
                onChange={(e) => {
                  setSimMachineId(e.target.value);
                  setSimResult(null);
                }}
              >
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.model} ({m.productionLine})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group flex-1">
              <label className="form-label" htmlFor="sim-part-select">Candidate Component to Test:</label>
              <select
                id="sim-part-select"
                className="form-select"
                value={simPartId}
                onChange={(e) => {
                  setSimPartId(e.target.value);
                  setSimResult(null);
                }}
              >
                {allParts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.manufacturer} {p.partNumber} ({p.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="simulator-btn-slot">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleRunSimulator}
              >
                <ShieldCheck size={16} />
                <span>Run Guardrail Inspection</span>
              </button>
            </div>
          </div>

          {/* Simulator Result Output */}
          {simResult && (
            <div className={`simulator-output-box mt-4 ${simResult.passed ? 'sim-passed' : 'sim-intercepted'}`}>
              <div className="sim-output-header">
                {simResult.passed ? (
                  <div className="sim-title-group text-emerald">
                    <CheckCircle2 size={20} />
                    <strong>PASSED ALL GUARDRAILS: Safe for Production Deployment</strong>
                  </div>
                ) : (
                  <div className="sim-title-group text-red">
                    <XCircle size={20} />
                    <strong>
                      {simResult.blocked ? 'INTERCEPTED & BLOCKED' : 'TOLERANCE REVIEW REQUIRED'}: Past Mistake Prevented!
                    </strong>
                  </div>
                )}
                <span className="tech-font text-muted-xs">
                  Score Impact: {simResult.scoreAdjustment > 0 ? `+${simResult.scoreAdjustment}` : simResult.scoreAdjustment}%
                </span>
              </div>

              {simResult.violations.length > 0 && (
                <div className="sim-violations-list mt-3">
                  <strong>Triggered Guardrails:</strong>
                  {simResult.violations.map((v, i) => (
                    <div key={i} className="sim-violation-item">
                      <div className="violation-badge-row">
                        <span className="badge-alert-red">{v.incidentNumber} Guardrail</span>
                        <span className="font-semibold text-sm">{v.guardrailTitle}</span>
                        <span className="text-muted-xs font-mono">Deduction: -{v.penalty}%</span>
                      </div>
                      <p className="violation-warning-text mt-1">{v.warning}</p>
                    </div>
                  ))}
                </div>
              )}

              {simResult.verifiedGuards.length > 0 && (
                <div className="sim-verified-list mt-3">
                  <strong>Verified Safeguards:</strong>
                  {simResult.verifiedGuards.map((vg, i) => (
                    <div key={i} className="sim-verified-item">
                      <CheckCircle2 size={14} className="text-emerald" />
                      <span className="text-sm">
                        <strong>{vg.guardrailTitle}:</strong> {vg.benefit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active Guardrail Registry */}
      <div className="panel-card mt-6">
        <div className="panel-header">
          <div className="panel-title-group">
            <Sliders size={18} className="text-teal" />
            <h3 className="panel-title">Active Learned Guardrails Registry</h3>
          </div>
          <div className="category-filter-pills">
            {['All', 'Environmental Washdown', 'Mechanical Clearance', 'Electrical Polarity', 'Supplier Reliability'].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`filter-pill-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="guardrails-card-grid p-4">
          {filteredGuardrails.map((guard) => (
            <div key={guard.id} className={`guardrail-rule-card ${!guard.active ? 'card-paused' : ''}`}>
              <div className="rule-card-header">
                <div>
                  <div className="rule-cat-row">
                    <span className="rule-category-tag">{guard.category}</span>
                    {guard.targetMachineName && (
                      <span className="rule-target-machine">{guard.targetMachineName}</span>
                    )}
                  </div>
                  <h4 className="rule-title mt-1">{guard.title}</h4>
                </div>

                <div className="rule-toggle-slot">
                  <button
                    type="button"
                    className={`toggle-switch-btn ${guard.active ? 'active' : ''}`}
                    onClick={() => toggleGuardrail(guard.id)}
                    title={guard.active ? 'Click to Pause Guardrail' : 'Click to Enable Guardrail'}
                  >
                    <span className="toggle-switch-slider"></span>
                  </button>
                  <span className={`toggle-status-text ${guard.active ? 'text-teal' : 'text-muted'}`}>
                    {guard.active ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </div>
              </div>

              <div className="rule-condition-box mt-3">
                <span className="rule-label">ENFORCED LOGIC:</span>
                <p className="rule-condition-text">{guard.ruleCondition}</p>
              </div>

              <div className="rule-card-footer mt-3">
                <div className="rule-origin-incident">
                  <Clock size={12} className="text-muted" />
                  <span>{guard.incidentSummary}</span>
                </div>
                <div className="rule-impact-badge">
                  <span className="prevented-count-pill">
                    <ShieldCheck size={12} />
                    <strong>{guard.preventedMistakeCount}</strong> Prevented
                  </span>
                  <span className="penalty-pill">
                    {guard.blockPart ? 'Auto-Block' : `-${guard.penaltyPoints} Pts`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Past Mistake Incident Logbook */}
      <div className="panel-card mt-6">
        <div className="panel-header">
          <div className="panel-title-group">
            <Flame size={18} className="text-orange" />
            <h3 className="panel-title">Past Mistake Incident Logbook (Learned Factory Incidents)</h3>
          </div>
          <span className="counter-badge">{pastMistakes.length} Documented Failures</span>
        </div>

        <div className="admin-table-wrapper">
          <table className="engineering-table">
            <thead>
              <tr>
                <th>Incident #</th>
                <th>Affected Machine</th>
                <th>Component Involved</th>
                <th>Failure & Root Cause Analysis</th>
                <th>Learned Prevention Action</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pastMistakes.map((inc) => (
                <tr key={inc.id}>
                  <td>
                    <span className="tech-font font-bold text-orange">{inc.incidentNumber}</span>
                    <div className="text-muted-xs tech-font">{inc.reportedDate.substring(0, 10)}</div>
                    <span className={`criticality-badge mt-1 ${inc.severity.includes('Critical') ? 'crit-high' : 'crit-medium'}`}>
                      {inc.severity}
                    </span>
                  </td>

                  <td>
                    <strong>{inc.machineName}</strong>
                    <div className="text-muted-xs tech-font">Reported by: {inc.reportedBy}</div>
                  </td>

                  <td>
                    <span className="tech-font font-semibold text-primary">{inc.partNumber}</span>
                    <div className="text-muted-xs">{inc.manufacturer}</div>
                    <div className="text-xs text-muted mt-1"><strong>Issue:</strong> {inc.mistakeType}</div>
                  </td>

                  <td style={{ maxWidth: '340px' }}>
                    <p className="text-sm font-medium">{inc.failureDescription}</p>
                    <div className="root-cause-tag mt-2">
                      <strong>Root Cause:</strong> {inc.rootCause}
                    </div>
                  </td>

                  <td style={{ maxWidth: '300px' }}>
                    <p className="text-xs text-muted">{inc.preventionAction}</p>
                    <div className="prevention-count-row mt-2">
                      <ShieldCheck size={13} className="text-teal" />
                      <span className="text-xs font-semibold text-teal">
                        Prevented {inc.preventionCount} times in searches
                      </span>
                    </div>
                  </td>

                  <td>
                    <span className="status-tag status-match">
                      <CheckCircle2 size={12} /> {inc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log New Mistake / Teach Engine Modal */}
      {showLogModal && (
        <div className="modal-overlay" onClick={() => setShowLogModal(false)}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <ShieldAlert size={20} className="text-orange" />
                <h3 className="modal-title">Teach Engine: Log Past Mistake & Synthesize Guardrail</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowLogModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                <p className="text-sm text-muted">
                  Record a physical fitment failure, washdown degradation, or supplier error observed in your plant. PartScout AI will automatically commit this rule to memory and intercept similar issues in future candidate searches.
                </p>

                <div className="form-grid-2col mt-4">
                  <div className="form-group">
                    <label className="form-label">Affected Machine Asset:</label>
                    <select
                      className="form-select"
                      value={formData.machineId}
                      onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
                    >
                      {machines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.model} ({m.facility} - {m.productionLine})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mistake Severity:</label>
                    <select
                      className="form-select"
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value as PastMistakeIncident['severity'] })}
                    >
                      <option value="Critical (Line Down)">Critical (Caused Line Shutdown)</option>
                      <option value="High">High (Required Emergency Rework)</option>
                      <option value="Medium">Medium (Tolerance or Drift Issue)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Component Part Number *:</label>
                    <input
                      type="text"
                      className="form-input tech-font"
                      placeholder="e.g. E2B-M18KS08-WP-B1"
                      value={formData.partNumber}
                      onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Manufacturer / Supplier:</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Omron Automation or Radwell Surplus"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group mt-3">
                  <label className="form-label">Failure Category:</label>
                  <select
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as LearnedGuardrail['category'] })}
                  >
                    <option value="Environmental Washdown">Environmental Washdown (Caustic/Moisture/Heat)</option>
                    <option value="Mechanical Clearance">Mechanical Clearance (Barrel Length/Threads/Mount)</option>
                    <option value="Electrical Polarity">Electrical Polarity (PNP vs NPN/Voltage)</option>
                    <option value="Supplier Reliability">Supplier Reliability (Ghost Stock/Stale Feed)</option>
                    <option value="Datasheet Conflict">Datasheet Conflict (Vendor Catalog Discrepancy)</option>
                  </select>
                </div>

                <div className="form-group mt-3">
                  <label className="form-label">What Failed in the Field? (Failure Description) *:</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Describe what went wrong when this part was installed or ordered (e.g. Barrel was 5mm too short for locknut; sensor failed after 2 days of 65°C washdown; PO was cancelled due to zero stock)..."
                    value={formData.failureDescription}
                    onChange={(e) => setFormData({ ...formData, failureDescription: e.target.value })}
                    required
                  ></textarea>
                </div>

                <div className="form-group mt-3">
                  <label className="form-label">Root Cause Analysis:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Housing was nickel-plated brass IP67 instead of 316L stainless steel IP69K"
                    value={formData.rootCause}
                    onChange={(e) => setFormData({ ...formData, rootCause: e.target.value })}
                  />
                </div>

                <div className="form-divider-line mt-4">
                  <span>Synthesised Guardrail Rule</span>
                </div>

                <div className="form-grid-2col mt-3">
                  <div className="form-group">
                    <label className="form-label">Guardrail Rule Title *:</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Enforce 316L Stainless Steel on Washdown Lines"
                      value={formData.ruleTitle}
                      onChange={(e) => setFormData({ ...formData, ruleTitle: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Enforcement Action:</label>
                    <div className="flex-row-gap mt-2">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.blockPart}
                          onChange={(e) => setFormData({ ...formData, blockPart: e.target.checked })}
                        />
                        <span>Hard Block Incompatible Candidates</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="form-group mt-3">
                  <label className="form-label">Rule Logic Condition:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. IF machine has washdown notes, REJECT housing != 316L Stainless Steel"
                    value={formData.ruleCondition}
                    onChange={(e) => setFormData({ ...formData, ruleCondition: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowLogModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Sparkles size={16} />
                  <span>Synthesize Guardrail & Update Knowledge Loop</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
