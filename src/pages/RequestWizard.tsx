import React, { useState } from 'react';
import { useApp, DraftRequestData } from '../context/AppContext';
import { DemoBadge } from '../components/DemoBadge';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building,
  Cpu,
  FileCheck2,
  Layers,
  Sparkles,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';

interface RequestWizardProps {
  step: 'machine' | 'part' | 'review';
}

export const RequestWizard: React.FC<RequestWizardProps> = ({ step }) => {
  const {
    navigate,
    machines,
    draftRequest,
    updateDraftRequest,
    resetDraftRequest,
    submitDraftRequest,
    addToast,
  } = useApp();

  const [useCustomMachine, setUseCustomMachine] = useState(false);

  // Validation helpers
  const isMachineValid = useCustomMachine
    ? !!(draftRequest.customMachineName && draftRequest.customMachineModel)
    : !!draftRequest.machineId;

  const isPartValid =
    draftRequest.partName.trim().length > 0 &&
    draftRequest.originalPartNumber.trim().length > 0 &&
    draftRequest.quantityNeeded > 0;

  const handleNextFromMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMachineValid) {
      addToast('Validation', 'Please select or enter machine equipment details.', 'warning');
      return;
    }
    navigate('/app/requests/new/part');
  };

  const handleNextFromPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPartValid) {
      addToast('Validation', 'Please specify part name, part number, and quantity.', 'warning');
      return;
    }
    navigate('/app/requests/new/review');
  };

  const handleFinalSubmit = async () => {
    try {
      const newRequestId = await submitDraftRequest();
      navigate(`/app/search/${newRequestId}`);
    } catch (error) {
      // Error toast already shown in submitDraftRequest
      console.error('Failed to submit draft request:', error);
    }
  };

  const loadScenarioPrefill = () => {
    updateDraftRequest({
      machineId: 'mach-rf480-line4',
      partName: 'M18 Shielded Inductive Proximity Sensor',
      originalPartNumber: 'BES 516-325-G-E5-C-S4',
      manufacturer: 'Balluff GmbH',
      quantityNeeded: 2,
      urgency: 'Line Down (Critical)',
      acceptableAlternatives: true,
      customRequirements:
        'Must be flush mount M18 with 8mm sensing range (Sn) and PNP Normally Open output. 316L stainless housing preferred due to daily 65°C caustic washdown. Standard 4-pin M12 connector.',
    });
    addToast('Scenario Loaded', 'Pre-filled with Bottling Line 4 M18 proximity sensor emergency.', 'info');
  };

  const selectedMachine = machines.find((m) => m.id === draftRequest.machineId);

  return (
    <div className="wizard-page-root">
      {/* Top Banner Notice */}
      <DemoBadge variant="banner" lastChecked="Simulated Request Engine" />

      {/* Wizard Header & Progress Bar */}
      <div className="wizard-header-container">
        <div className="wizard-title-row">
          <div>
            <span className="wizard-kicker">MULTI-STAGE PART DISCOVERY PIPELINE</span>
            <h1 className="wizard-title">Start a Spare Part Investigation</h1>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadScenarioPrefill}
            title="Pre-populate with the Packaging Line 4 proximity sensor emergency"
          >
            <Sparkles size={14} className="text-orange" />
            <span>Load Line 4 Emergency Scenario</span>
          </button>
        </div>

        {/* Step Indicator Tabs */}
        <div className="wizard-steps-indicator">
          <div
            className={`wizard-step-node ${step === 'machine' ? 'active' : 'completed'}`}
            onClick={() => navigate('/app/requests/new/machine')}
          >
            <div className="step-circle">{step !== 'machine' ? <CheckCircle2 size={14} /> : '1'}</div>
            <div className="step-label-group">
              <span className="step-tag">STEP 1</span>
              <span className="step-name">Machine Details</span>
            </div>
          </div>

          <div className="step-connector"></div>

          <div
            className={`wizard-step-node ${step === 'part' ? 'active' : step === 'review' ? 'completed' : ''}`}
            onClick={() => isMachineValid && navigate('/app/requests/new/part')}
          >
            <div className="step-circle">{step === 'review' ? <CheckCircle2 size={14} /> : '2'}</div>
            <div className="step-label-group">
              <span className="step-tag">STEP 2</span>
              <span className="step-name">Part Requirements</span>
            </div>
          </div>

          <div className="step-connector"></div>

          <div
            className={`wizard-step-node ${step === 'review' ? 'active' : ''}`}
            onClick={() => isMachineValid && isPartValid && navigate('/app/requests/new/review')}
          >
            <div className="step-circle">3</div>
            <div className="step-label-group">
              <span className="step-tag">STEP 3</span>
              <span className="step-name">Review & Initiate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Wizard Form Body */}
      <div className="wizard-card">
        {/* ================= STEP 1: MACHINE DETAILS ================= */}
        {step === 'machine' && (
          <form onSubmit={handleNextFromMachine} className="wizard-form-section">
            <div className="form-section-intro">
              <div className="intro-icon">
                <Building size={20} className="text-teal" />
              </div>
              <div>
                <h3 className="section-heading">Identify the Machine Asset</h3>
                <p className="section-subtext">
                  Specifying the exact machine model, production line, and physical mounting environment helps PartScout verify chemical washdown ratings and space envelope constraints.
                </p>
              </div>
            </div>

            {/* Select existing registered machine or custom */}
            <div className="form-group">
              <label className="form-label">Plant Equipment Selection</label>
              <div className="machine-toggle-pills">
                <button
                  type="button"
                  className={`pill-option ${!useCustomMachine ? 'selected' : ''}`}
                  onClick={() => setUseCustomMachine(false)}
                >
                  <span>Select from Facility Equipment Registry</span>
                </button>
                <button
                  type="button"
                  className={`pill-option ${useCustomMachine ? 'selected' : ''}`}
                  onClick={() => setUseCustomMachine(true)}
                >
                  <span>Enter Unregistered or Custom Machine</span>
                </button>
              </div>
            </div>

            {!useCustomMachine ? (
              <div className="machine-selector-grid">
                {machines.map((mach) => (
                  <div
                    key={mach.id}
                    className={`machine-select-card ${draftRequest.machineId === mach.id ? 'selected' : ''}`}
                    onClick={() => updateDraftRequest({ machineId: mach.id })}
                  >
                    <div className="mach-card-top">
                      <span className="mach-mfg-tag">{mach.manufacturer}</span>
                      <span className={`criticality-badge crit-${mach.criticality.toLowerCase()}`}>
                        {mach.criticality} Priority
                      </span>
                    </div>
                    <h4 className="mach-card-model">{mach.model}</h4>
                    <div className="mach-card-type">{mach.machineType}</div>
                    <div className="mach-card-line">
                      <strong>Location:</strong> {mach.productionLine}
                    </div>
                    <p className="mach-card-notes">{mach.notes}</p>
                    <div className="selection-radio">
                      <input
                        type="radio"
                        name="machine"
                        checked={draftRequest.machineId === mach.id}
                        onChange={() => updateDraftRequest({ machineId: mach.id })}
                      />
                      <span>Selected for Sourcing</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="custom-machine-fields">
                <div className="form-row">
                  <div className="form-group col-6">
                    <label className="form-label" htmlFor="custom-mfg">Machine Manufacturer</label>
                    <input
                      id="custom-mfg"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Tetra Pak / Bosch Packaging"
                      value={draftRequest.customMachineName || ''}
                      onChange={(e) => updateDraftRequest({ customMachineName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group col-6">
                    <label className="form-label" htmlFor="custom-model">Machine Model & Serial</label>
                    <input
                      id="custom-model"
                      type="text"
                      className="form-input"
                      placeholder="e.g. A3/Flex 0400"
                      value={draftRequest.customMachineModel || ''}
                      onChange={(e) => updateDraftRequest({ customMachineModel: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="wizard-nav-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => navigate('/app/dashboard')}
              >
                Cancel
              </button>

              <button type="submit" className="btn btn-primary btn-lg">
                <span>Continue to Part Requirements</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 2: PART REQUIREMENTS ================= */}
        {step === 'part' && (
          <form onSubmit={handleNextFromPart} className="wizard-form-section">
            <div className="form-section-intro">
              <div className="intro-icon">
                <Cpu size={20} className="text-teal" />
              </div>
              <div>
                <h3 className="section-heading">Specify Required Component & Parameters</h3>
                <p className="section-subtext">
                  Provide part numbers and technical thresholds. PartScout will benchmark candidate cross-references against these exact specifications.
                </p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group col-6">
                <label className="form-label" htmlFor="req-part-name">Component Name / Functional Description *</label>
                <input
                  id="req-part-name"
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. M18 Shielded Inductive Proximity Sensor"
                  value={draftRequest.partName}
                  onChange={(e) => updateDraftRequest({ partName: e.target.value })}
                />
              </div>

              <div className="form-group col-6">
                <label className="form-label" htmlFor="req-orig-pn">Original OEM Part Number *</label>
                <input
                  id="req-orig-pn"
                  type="text"
                  className="form-input tech-font"
                  required
                  placeholder="e.g. BES 516-325-G-E5-C-S4"
                  value={draftRequest.originalPartNumber}
                  onChange={(e) => updateDraftRequest({ originalPartNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group col-4">
                <label className="form-label" htmlFor="req-mfg">OEM Manufacturer</label>
                <input
                  id="req-mfg"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Balluff GmbH"
                  value={draftRequest.manufacturer}
                  onChange={(e) => updateDraftRequest({ manufacturer: e.target.value })}
                />
              </div>

              <div className="form-group col-4">
                <label className="form-label" htmlFor="req-qty">Quantity Needed *</label>
                <input
                  id="req-qty"
                  type="number"
                  min="1"
                  max="1000"
                  className="form-input"
                  required
                  value={draftRequest.quantityNeeded}
                  onChange={(e) => updateDraftRequest({ quantityNeeded: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="form-group col-4">
                <label className="form-label" htmlFor="req-urgency">Plant Urgency Level</label>
                <select
                  id="req-urgency"
                  className="form-select"
                  value={draftRequest.urgency}
                  onChange={(e) => updateDraftRequest({ urgency: e.target.value as DraftRequestData['urgency'] })}
                >
                  <option value="Line Down (Critical)">Line Down (Critical - Immediate)</option>
                  <option value="Urgent (24-48h)">Urgent (24-48 Hours)</option>
                  <option value="Planned Maintenance">Planned Maintenance Shutdown</option>
                  <option value="Standard Restock">Standard Inventory Restock</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="req-specs">
                Required Technical Specifications & Environmental Constraints
              </label>
              <textarea
                id="req-specs"
                className="form-textarea"
                rows={3}
                placeholder="Include thread dimensions (M18x1), flush/non-flush mounting, sensing range (8mm), electrical logic (PNP NO), connector style (M12 4-pin), IP washdown rating, etc."
                value={draftRequest.customRequirements}
                onChange={(e) => updateDraftRequest({ customRequirements: e.target.value })}
              />
              <span className="field-hint">
                These constraints drive deterministic comparison filtering against distributor catalog parameter tables.
              </span>
            </div>

            <div className="form-group">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={draftRequest.acceptableAlternatives}
                  onChange={(e) => updateDraftRequest({ acceptableAlternatives: e.target.checked })}
                />
                <span className="checkbox-label">
                  <strong>Allow functional equivalents & drop-in cross-references:</strong> If OEM is out of stock, evaluate certified industrial alternatives (e.g. ifm, Turck, Pepperl+Fuchs, SICK).
                </span>
              </label>
            </div>

            <div className="wizard-nav-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => navigate('/app/requests/new/machine')}
              >
                <ArrowLeft size={16} />
                <span>Back to Machine</span>
              </button>

              <button type="submit" className="btn btn-primary btn-lg">
                <span>Proceed to Review</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 3: REVIEW & INITIATE ================= */}
        {step === 'review' && (
          <div className="wizard-form-section">
            <div className="form-section-intro">
              <div className="intro-icon">
                <FileCheck2 size={20} className="text-teal" />
              </div>
              <div>
                <h3 className="section-heading">Review Sourcing Criteria Before Dispatch</h3>
                <p className="section-subtext">
                  Confirm your specifications below. When launched, PartScout will execute a structured search across 14 authorized distributors and manufacturer portals.
                </p>
              </div>
            </div>

            <div className="review-summary-grid">
              <div className="review-card">
                <div className="review-card-header">
                  <span className="review-card-title">1. Machine Context</span>
                  <button
                    type="button"
                    className="btn-edit-step"
                    onClick={() => navigate('/app/requests/new/machine')}
                  >
                    Edit
                  </button>
                </div>
                <div className="review-row">
                  <span className="review-lbl">Machine:</span>
                  <strong className="review-val">
                    {selectedMachine ? selectedMachine.model : draftRequest.customMachineName}
                  </strong>
                </div>
                <div className="review-row">
                  <span className="review-lbl">Manufacturer:</span>
                  <span className="review-val">
                    {selectedMachine ? selectedMachine.manufacturer : 'Custom Facility Asset'}
                  </span>
                </div>
                <div className="review-row">
                  <span className="review-lbl">Production Line:</span>
                  <span className="review-val">
                    {selectedMachine ? selectedMachine.productionLine : 'Main Facility'}
                  </span>
                </div>
                <div className="review-row">
                  <span className="review-lbl">Criticality:</span>
                  <span className="review-val font-semibold text-orange">
                    {selectedMachine ? `${selectedMachine.criticality} Priority` : 'Standard'}
                  </span>
                </div>
              </div>

              <div className="review-card">
                <div className="review-card-header">
                  <span className="review-card-title">2. Target Component</span>
                  <button
                    type="button"
                    className="btn-edit-step"
                    onClick={() => navigate('/app/requests/new/part')}
                  >
                    Edit
                  </button>
                </div>
                <div className="review-row">
                  <span className="review-lbl">Part Name:</span>
                  <strong className="review-val">{draftRequest.partName}</strong>
                </div>
                <div className="review-row">
                  <span className="review-lbl">OEM Part Number:</span>
                  <span className="review-val tech-font text-primary font-semibold">
                    {draftRequest.originalPartNumber}
                  </span>
                </div>
                <div className="review-row">
                  <span className="review-lbl">Quantity Needed:</span>
                  <span className="review-val font-semibold">{draftRequest.quantityNeeded} units</span>
                </div>
                <div className="review-row">
                  <span className="review-lbl">Urgency:</span>
                  <span className="status-tag status-review font-semibold">{draftRequest.urgency}</span>
                </div>
                <div className="review-row">
                  <span className="review-lbl">Cross-References:</span>
                  <span className="review-val">
                    {draftRequest.acceptableAlternatives ? 'Permitted (Recommended)' : 'Strict OEM Only'}
                  </span>
                </div>
              </div>
            </div>

            <div className="review-specs-box">
              <span className="review-specs-lbl">Verified Specification Constraints:</span>
              <p className="review-specs-text">{draftRequest.customRequirements}</p>
            </div>

            <div className="pipeline-notice-box">
              <AlertTriangle size={16} className="text-amber" />
              <div className="notice-text">
                <strong>Simulated Research Pipeline:</strong> In this UI prototype, clicking "Initiate Part Search" executes a realistic 6-stage crawler demonstration across simulated distributor sources, populating genuine engineering comparison metrics.
              </div>
            </div>

            <div className="wizard-nav-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => navigate('/app/requests/new/part')}
              >
                <ArrowLeft size={16} />
                <span>Back to Part Requirements</span>
              </button>

              <button
                type="button"
                className="btn btn-primary btn-lg shadow-lift"
                onClick={handleFinalSubmit}
              >
                <span>Initiate Intelligent Part Search</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
