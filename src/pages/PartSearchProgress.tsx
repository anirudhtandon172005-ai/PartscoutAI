import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DemoBadge } from '../components/DemoBadge';
import {
  Globe,
  Download,
  Layers,
  Scale,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  ArrowRight,
  Terminal,
  RotateCcw,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface Stage {
  id: number;
  name: string;
  desc: string;
  icon: React.ReactNode;
  status: 'pending' | 'running' | 'completed' | 'error';
  metric: string;
}

export const PartSearchProgress: React.FC<{ requestId?: string }> = ({ requestId = 'req-2026-line4-sensor' }) => {
  const { navigate, requests, sourceDomains, addToast } = useApp();

  const currentReq = requests.find((r) => r.id === requestId) || requests[0];

  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [simulatedError, setSimulatedError] = useState(false);

  const initialStages: Stage[] = [
    {
      id: 1,
      name: 'Source Discovery',
      desc: 'Identify targeted manufacturer portals and franchised distributors matching M18 inductive category.',
      icon: <Globe size={18} />,
      status: 'pending',
      metric: '14 Domains Target Registry',
    },
    {
      id: 2,
      name: 'Page Retrieval & Parsing',
      desc: 'Retrieve catalog DOM and structured PDF datasheets for candidate part numbers.',
      icon: <Download size={18} />,
      status: 'pending',
      metric: '38 Pages Fetched',
    },
    {
      id: 3,
      name: 'Attribute & Offer Extraction',
      desc: 'Extract electrical, mechanical, and pricing attributes using deterministic table extractors.',
      icon: <Layers size={18} />,
      status: 'pending',
      metric: '4 Candidates Identified',
    },
    {
      id: 4,
      name: 'Unit Normalization',
      desc: 'Normalize millimeter lengths, thread pitch, voltage ranges, and switching polarities to IEC standards.',
      icon: <Scale size={18} />,
      status: 'pending',
      metric: '12 Standardized Attributes',
    },
    {
      id: 5,
      name: 'Deterministic Requirement Validation',
      desc: 'Validate candidates against Line 4 M18 flush, PNP NO, 8mm sensing range requirement rules.',
      icon: <CheckCircle2 size={18} />,
      status: 'pending',
      metric: '96% Max Compatibility',
    },
    {
      id: 6,
      name: 'Evidence & Uncertainty Compilation',
      desc: 'Extract verifiable text citations, catalog publication dates, and flag stale inventory.',
      icon: <ShieldCheck size={18} />,
      status: 'pending',
      metric: '4 Primary Citations Attached',
    },
  ];

  const [stages, setStages] = useState<Stage[]>(initialStages);

  // Simulation timer
  useEffect(() => {
    if (isPaused || simulatedError) return;

    if (currentStageIndex >= stages.length) {
      return; // completed
    }

    const stageTimer = setTimeout(() => {
      // Mark current stage completed
      setStages((prev) =>
        prev.map((s, idx) => {
          if (idx < currentStageIndex) return { ...s, status: 'completed' };
          if (idx === currentStageIndex) return { ...s, status: 'running' };
          return { ...s, status: 'pending' };
        })
      );

      // Add log
      const logMessages = [
        `[0.4s] [DISCOVERY] Resolved targeted catalog registry: balluff.com, ifm.com, turck.us, pepperl-fuchs.com, mcmaster.com, radwell.com, digikey.com.`,
        `[1.2s] [FETCH] Retrieved product datasheets & DOM content for BES 516, IGT205, Bi8U-M18, NBB8, IME18 (HTTP 200 OK).`,
        `[2.1s] [EXTRACT] Extracted 48 raw technical parameters and 7 real-time supplier offers across 4 geographic hubs.`,
        `[3.0s] [NORMALIZE] Standardized attributes to IEC 60947-5-2: Thread M18x1.0, Sn 8.0mm, DC 3-wire PNP Normally Open.`,
        `[3.8s] [COMPARE] Evaluated candidate matrix: ifm IGT205 (96% drop-in), Turck Bi8U (92% equivalent), P+F NBB8 (88% mounting review).`,
        `[4.5s] [EVIDENCE] Compiled 4 primary PDF citations with retrieval timestamps and verified audit excerpts.`,
      ];

      setLogs((prev) => [...prev, logMessages[currentStageIndex]]);

      // Move to next stage
      if (currentStageIndex + 1 <= stages.length) {
        setCurrentStageIndex((prev) => prev + 1);
      }
    }, 900);

    return () => clearTimeout(stageTimer);
  }, [currentStageIndex, isPaused, simulatedError]);

  const isComplete = currentStageIndex >= stages.length;

  const handleReset = () => {
    setCurrentStageIndex(0);
    setLogs([]);
    setSimulatedError(false);
    setStages(initialStages);
  };

  const handleToggleError = () => {
    if (!simulatedError) {
      setSimulatedError(true);
      setLogs((prev) => [
        ...prev,
        `[WARN] [RATE_LIMIT] Provider gateway returned HTTP 429 Too Many Requests on secondary source. Retrying with exponential backoff...`,
      ]);
      addToast('Crawler Demonstration', 'Simulated transient source rate-limit and backoff.', 'warning');
    } else {
      setSimulatedError(false);
      setLogs((prev) => [...prev, `[INFO] [RECOVERED] Rate limit window cleared. Resuming crawl pipeline.`]);
      addToast('Crawler Recovered', 'Resuming simulated extraction.', 'success');
    }
  };

  return (
    <div className="search-progress-root">
      {/* Top Banner Notice */}
      <DemoBadge variant="banner" lastChecked="Live Crawler Simulation" />

      {/* Header */}
      <div className="search-progress-header">
        <div className="search-meta-group">
          <span className="badge-tag live-cad">
            <span className="dot pulse"></span> SEARCH EXECUTION PIPELINE
          </span>
          <h1 className="search-progress-title">
            Researching Cross-References for {currentReq.originalPartNumber}
          </h1>
          <p className="search-progress-sub">
            Target Part: <strong>{currentReq.partName}</strong> • Facility Machine: {currentReq.machineName}
          </p>
        </div>

        {/* Action Controls */}
        <div className="search-controls-group">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setIsPaused(!isPaused)}
            title="Pause or resume crawler simulation"
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleToggleError}
            title="Demonstrate crawler error state and backoff"
          >
            <AlertTriangle size={14} className={simulatedError ? 'text-orange' : 'text-muted'} />
            <span>{simulatedError ? 'Clear Error State' : 'Simulate Stale Error'}</span>
          </button>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleReset}
            title="Restart simulation"
          >
            <RotateCcw size={14} />
            <span>Restart</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm shadow-lift"
            onClick={() => navigate(`/app/results/${currentReq.id}`)}
          >
            <span>{isComplete ? 'View Search Results' : 'Skip Directly to Results'}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Progress Metric Bar */}
      <div className="progress-metric-strip">
        <div className="metric-col">
          <span className="strip-lbl">Research Status</span>
          <strong className={`strip-val ${isComplete ? 'text-teal' : 'text-orange'}`}>
            {simulatedError ? 'Warning: Backoff Retrying' : isComplete ? 'Research Completed' : 'Crawl in Progress...'}
          </strong>
        </div>

        <div className="metric-col">
          <span className="strip-lbl">Targeted Domains</span>
          <strong className="strip-val tech-font">14 Catalog Registries</strong>
        </div>

        <div className="metric-col">
          <span className="strip-lbl">Identified Candidates</span>
          <strong className="strip-val tech-font text-teal">4 Equivalents Found</strong>
        </div>

        <div className="metric-col">
          <span className="strip-lbl">Top Match Score</span>
          <strong className="strip-val tech-font text-teal">96% (ifm IGT205)</strong>
        </div>
      </div>

      {/* Stages Grid */}
      <div className="stages-container">
        <h3 className="stages-header-label">7-STAGE DISCOVERY & NORMALIZATION ARCHITECTURE</h3>
        <div className="stages-list">
          {stages.map((stage, idx) => {
            const isStageDone = idx < currentStageIndex || isComplete;
            const isStageActive = idx === currentStageIndex && !isComplete;

            return (
              <div
                key={stage.id}
                className={`stage-card ${isStageDone ? 'completed' : isStageActive ? 'running' : 'pending'}`}
              >
                <div className="stage-status-col">
                  {isStageDone ? (
                    <div className="stage-check-icon">
                      <CheckCircle2 size={18} className="text-teal" />
                    </div>
                  ) : isStageActive ? (
                    <div className="stage-spinner-icon">
                      <span className="spinner-dot"></span>
                    </div>
                  ) : (
                    <div className="stage-pending-icon">{stage.id}</div>
                  )}
                </div>

                <div className="stage-body">
                  <div className="stage-title-row">
                    <h4 className="stage-name">{stage.name}</h4>
                    <span className="stage-metric tech-font">{stage.metric}</span>
                  </div>
                  <p className="stage-desc">{stage.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Crawler Console Log Feed */}
      <div className="crawler-terminal-card">
        <div className="terminal-header">
          <div className="terminal-title">
            <Terminal size={14} className="text-teal" />
            <span>Targeted Crawler Standard Output (Demo Stream)</span>
          </div>
          <span className="terminal-status tech-font">
            {isPaused ? 'STREAM PAUSED' : isComplete ? 'PIPELINE DONE' : 'STREAMING LIVE'}
          </span>
        </div>

        <div className="terminal-body tech-font">
          {logs.map((log, index) => (
            <div key={index} className="log-line">
              <span className="log-bullet">&gt;</span>
              <span>{log}</span>
            </div>
          ))}
          {logs.length === 0 && <div className="text-muted">Initializing crawler worker queue...</div>}
          {!isComplete && !isPaused && !simulatedError && (
            <div className="log-line text-teal">
              <span className="cursor-blink">▋</span>
            </div>
          )}
        </div>
      </div>

      {/* Completed State Handoff CTA */}
      {isComplete && (
        <div className="completed-handoff-banner">
          <div className="handoff-content">
            <CheckCircle2 size={24} className="text-teal" />
            <div>
              <h3 className="handoff-title">Part Intelligence Ready for Engineering Review</h3>
              <p className="handoff-desc">
                4 viable candidate replacements have been extracted and compared against Line 4 constraints.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-lg shadow-lift"
            onClick={() => navigate(`/app/results/${currentReq.id}`)}
          >
            <span>Review 4 Candidate Replacements</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};
