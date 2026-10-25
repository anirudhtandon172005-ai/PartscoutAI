import React, { useState, useEffect, useRef } from 'react';
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
  ArrowRight,
  Terminal,
  Search,
  Clock,
} from 'lucide-react';
import { getSearch, getCandidates, SearchStatusResponse, SearchStage } from '../api/searches';

// Client-side hard timeout (seconds) - must exceed backend deadline (120s) + buffer
const CLIENT_TIMEOUT_SECONDS = 180;

interface Stage {
  id: SearchStage;
  name: string;
  desc: string;
  icon: React.ReactNode;
  metric: string;
}

const STAGE_CONFIG: Stage[] = [
  {
    id: 'source_discovery',
    name: 'Source Discovery',
    desc: 'Identify targeted manufacturer portals and franchised distributors matching M18 inductive category.',
    icon: <Globe size={18} />,
    metric: '14 Domains Target Registry',
  },
  {
    id: 'page_retrieval',
    name: 'Page Retrieval & Parsing',
    desc: 'Retrieve catalog DOM and structured PDF datasheets for candidate part numbers.',
    icon: <Download size={18} />,
    metric: '38 Pages Fetched',
  },
  {
    id: 'attribute_extraction',
    name: 'Attribute & Offer Extraction',
    desc: 'Extract electrical, mechanical, and pricing attributes using deterministic table extractors.',
    icon: <Layers size={18} />,
    metric: '4 Candidates Identified',
  },
  {
    id: 'normalization',
    name: 'Unit Normalization',
    desc: 'Normalize millimeter lengths, thread pitch, voltage ranges, and switching polarities to IEC standards.',
    icon: <Scale size={18} />,
    metric: '12 Standardized Attributes',
  },
  {
    id: 'validation',
    name: 'Deterministic Requirement Validation',
    desc: 'Validate candidates against Line 4 M18 flush, PNP NO, 8mm sensing range requirement rules.',
    icon: <CheckCircle2 size={18} />,
    metric: '96% Max Compatibility',
  },
  {
    id: 'evidence_compilation',
    name: 'Evidence & Uncertainty Compilation',
    desc: 'Extract verifiable text citations, catalog publication dates, and flag stale inventory.',
    icon: <ShieldCheck size={18} />,
    metric: '4 Primary Citations Attached',
  },
];

function getVisualStageIndex(stage: SearchStage | null): number {
  switch (stage) {
    case 'source_discovery':
      return 0;
    case 'page_retrieval':
      return 1;
    case 'attribute_extraction':
      return 2;
    case 'normalization':
      return 3;
    case 'validation':
      return 4;
    case 'evidence_compilation':
      return 5;
    default:
      return 0;
  }
}

function getStageStatus(
  stageId: SearchStage,
  backendStage: SearchStage | null,
  status: SearchStatusResponse['status'],
): 'pending' | 'running' | 'completed' | 'error' {
  if (status === 'queued') {
    return 'pending';
  }
  if (status === 'failed') {
    const backendIndex = backendStage ? getVisualStageIndex(backendStage) : -1;
    const stageIndex = getVisualStageIndex(stageId);
    if (stageIndex < backendIndex) return 'completed';
    if (stageIndex === backendIndex) return 'error';
    return 'pending';
  }
  if (status === 'completed') {
    return 'completed';
  }
  // running
  const backendIndex = backendStage ? getVisualStageIndex(backendStage) : -1;
  const stageIndex = getVisualStageIndex(stageId);
  if (stageIndex < backendIndex) return 'completed';
  if (stageIndex === backendIndex) return 'running';
  return 'pending';
}

export const PartSearchProgress: React.FC<{ searchId?: string }> = ({ searchId }) => {
  const { navigate, addToast } = useApp();

  const [searchStatus, setSearchStatus] = useState<SearchStatusResponse | null>(null);
  const [candidates, setCandidates] = useState<Awaited<ReturnType<typeof getCandidates>>['items']>([]);
  const [error, setError] = useState<string | null>(() => (searchId ? null : 'Missing search ID.'));
  const [timedOut, setTimedOut] = useState(false);
  const addToastRef = useRef(addToast);
  const startTimeRef = useRef<number>(Date.now());

  // Poll the backend sequentially; the next request is scheduled only after the current one finishes.
  useEffect(() => {
    if (!searchId) return;

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    let completionNotified = false;

    const loadStatus = async () => {
      try {
        // Client-side hard timeout
        if (Date.now() - startTimeRef.current > CLIENT_TIMEOUT_SECONDS * 1000) {
          if (!completionNotified) {
            completionNotified = true;
            setTimedOut(true);
            setError('Search timed out. The pipeline did not complete within the allowed time.');
            addToastRef.current('Search Timed Out', 'Please retry the search.', 'warning');
          }
          return;
        }

        const status = await getSearch(searchId, controller.signal);
        if (!active) return;
        setSearchStatus(status);
        setError(status.status === 'failed' ? status.error || 'Search failed' : null);

        if (status.status === 'completed') {
          const candidatesResponse = await getCandidates(searchId, controller.signal);
          if (!active) return;
          setCandidates(candidatesResponse.items);
          if (!completionNotified) {
            completionNotified = true;
            addToastRef.current('Research Completed', 'Candidate replacements found.', 'success');
          }
          return;
        }

        if (status.status === 'failed') {
          if (!completionNotified) {
            completionNotified = true;
            addToastRef.current('Search Failed', status.error || 'Unknown error', 'warning');
          }
          return;
        }

        timer = setTimeout(loadStatus, 1000);
      } catch (err) {
        if (!active || controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Unable to load search status');
      }
    };

    startTimeRef.current = Date.now();
    void loadStatus();
    return () => {
      active = false;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [searchId]);

  const isComplete = searchStatus?.status === 'completed';
  const isFailed = searchStatus?.status === 'failed';
  const isQueued = searchStatus?.status === 'queued';
  const isRunning = searchStatus?.status === 'running';

  const request = searchStatus?.request;

  return (
    <div className="search-progress-root">
      {/* Top Banner Notice */}
      <DemoBadge variant="banner" lastChecked="LOCAL SEARCH PROVIDER" />

      {/* Header */}
      <div className="search-progress-header">
        <div className="search-meta-group">
          <span className="badge-tag live-cad">
            <span className="dot pulse"></span> SEARCH EXECUTION PIPELINE
          </span>
          <h1 className="search-progress-title">
            Researching Cross-References for {request?.originalPartNumber || 'Loading...'}
          </h1>
          <p className="search-progress-sub">
            Target Part: <strong>{request?.partName || 'Loading...'}</strong> • Facility Machine: {request?.machineName || 'Loading...'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="search-controls-group">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => navigate('/app/dashboard')}
            title="Return to dashboard"
          >
            <Search size={14} />
            <span>New Search</span>
          </button>

          {isFailed && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => searchId && navigate(`/app/requests/new/machine`)}
            >
              <span>Retry Search</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Progress Metric Bar */}
      <div className="progress-metric-strip">
        <div className="metric-col">
          <span className="strip-lbl">Research Status</span>
          <strong className={`strip-val ${isComplete ? 'text-teal' : isFailed ? 'text-red' : isRunning ? 'text-orange' : 'text-amber'}`}>
            {isFailed
              ? 'Failed'
              : isComplete
              ? 'Research Completed'
              : isRunning
              ? `Running: ${searchStatus?.stageMessage || 'Processing...'}`
              : isQueued
              ? 'Queued...'
              : 'Initializing...'}
          </strong>
        </div>

        <div className="metric-col">
          <span className="strip-lbl">Progress</span>
          <strong className="strip-val tech-font">{searchStatus?.progressPercent ?? 0}%</strong>
        </div>

        <div className="metric-col">
          <span className="strip-lbl">Current Stage</span>
          <strong className="strip-val tech-font text-teal">{searchStatus?.stage ? searchStatus.stage.replace('_', ' ').toUpperCase() : 'PENDING'}</strong>
        </div>

        <div className="metric-col">
          <span className="strip-lbl">Candidates Found</span>
          <strong className="strip-val tech-font text-teal">{searchStatus?.candidateCount ?? 0} Equivalents</strong>
        </div>
      </div>

      {/* Stages Grid */}
      <div className="stages-container">
        <h3 className="stages-header-label">6-STAGE DISCOVERY & NORMALIZATION ARCHITECTURE</h3>
        <div className="stages-list">
          {STAGE_CONFIG.map((stage, idx) => {
            const stageStatus = getStageStatus(stage.id, searchStatus?.stage ?? null, searchStatus?.status ?? 'queued');
            const isStageDone = stageStatus === 'completed';
            const isStageActive = stageStatus === 'running';
            const isStageError = stageStatus === 'error';
            const stageMetric = isStageError
              ? 'Failed at this stage'
              : isStageDone
              ? 'Backend completed'
              : isStageActive
              ? `${searchStatus?.progressPercent ?? 0}% reported`
              : 'Waiting for backend';

            return (
              <div
                key={stage.id}
                className={`stage-card ${isStageDone ? 'completed' : isStageActive ? 'running' : isStageError ? 'error' : 'pending'}`}
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
                  ) : isStageError ? (
                    <div className="stage-error-icon">
                      <AlertTriangle size={18} className="text-red" />
                    </div>
                  ) : (
                    <div className="stage-pending-icon">{idx + 1}</div>
                  )}
                </div>

                <div className="stage-body">
                  <div className="stage-title-row">
                    <h4 className="stage-name">{stage.name}</h4>
                    <span className="stage-metric tech-font">{stageMetric}</span>
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
            <span>Targeted Crawler Standard Output (Backend-Driven)</span>
          </div>
          <span className="terminal-status tech-font">
            {isComplete ? 'PIPELINE DONE' : isFailed ? 'FAILED' : isRunning ? 'STREAMING LIVE' : 'INITIALIZING'}
          </span>
        </div>

        <div className="terminal-body tech-font">
          {searchStatus?.status === 'queued' && (
            <div className="log-line">
              <span className="log-bullet">{'>'}</span>
              <span>Search queued. Initializing crawler worker queue...</span>
            </div>
          )}
          {searchStatus?.status === 'running' && (
            <>
              <div className="log-line">
                <span className="log-bullet">{'>'}</span>
                <span>[{searchStatus.progressPercent}%] {searchStatus.stageMessage}</span>
              </div>
              <div className="log-line text-teal">
                <span className="cursor-blink">▋</span>
              </div>
            </>
          )}
          {searchStatus?.status === 'completed' && (
            <>
              <div className="log-line">
                <span className="log-bullet">{'>'}</span>
                <span>[100%] Search completed. {searchStatus.candidateCount} candidates compiled.</span>
              </div>
              <div className="log-line text-teal">
                <span>Pipeline finished successfully.</span>
              </div>
            </>
          )}
          {searchStatus?.status === 'failed' && (
            <>
              <div className="log-line text-red">
                <span className="log-bullet">{'>'}</span>
                <span>[ERROR] {searchStatus.error || 'Unknown error'}</span>
              </div>
              <div className="log-line text-red">
                <span className="log-bullet">{'>'}</span>
                <span>Pipeline terminated at stage: {searchStatus?.stage?.replace('_', ' ') || 'unknown'}</span>
              </div>
            </>
          )}
          {!searchStatus && (
            <div className="text-muted">Connecting to backend...</div>
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
                {candidates.length > 0
                  ? `${candidates.length} viable candidate replacements have been extracted and compared against constraints.`
                  : 'Candidate replacements have been extracted and compared against constraints.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-lg shadow-lift"
            onClick={() => searchId && navigate(`/app/results/${searchId}`)}
          >
            <span>Review {candidates.length > 0 ? candidates.length : 'Candidate'} Replacements</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Error State */}
      {(isFailed || error || timedOut) && (
        <div className="error-banner">
          {timedOut ? <Clock size={24} className="text-amber" /> : <AlertTriangle size={24} className="text-red" />}
          <div>
            <h3 className="handoff-title">{timedOut ? 'Search Timed Out' : 'Search Failed'}</h3>
            <p className="handoff-desc">{error || searchStatus?.error || 'An unknown error occurred'}</p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() => searchId && navigate(`/app/requests/new/machine`)}
          >
            <span>Retry Search</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};
