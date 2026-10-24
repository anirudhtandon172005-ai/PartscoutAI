import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DemoBadge } from '../components/DemoBadge';
import {
  FileCheck2,
  CheckCircle2,
  Clock,
  PlusCircle,
  Building,
  ArrowRight,
  MessageSquare,
  AlertTriangle,
  Send,
  User,
} from 'lucide-react';
import { PartRequest } from '../types';

export const PartTrackingPage: React.FC = () => {
  const { requests, updateRequestStatus, addRequestNote, currentUser, navigate } = useApp();

  const [selectedRequestId, setSelectedRequestId] = useState(requests[0]?.id || '');
  const [newNoteText, setNewNoteText] = useState('');

  const currentRequest = requests.find((r) => r.id === selectedRequestId) || requests[0];

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    addRequestNote(currentRequest.id, newNoteText);
    setNewNoteText('');
  };

  const statuses: PartRequest['status'][] = [
    'Draft',
    'Researching',
    'Candidates Found',
    'Quote Requested',
    'Approved',
    'PO Issued',
    'Installed',
  ];

  return (
    <div className="tracking-page-root">
      {/* Top Banner Notice */}
      <DemoBadge variant="banner" lastChecked="Local State Tracking" />

      {/* Header */}
      <div className="tracking-header-row">
        <div>
          <div className="kicker-line">
            <span className="badge-tag live-cad">MAINTENANCE & PROCUREMENT BOARD</span>
            <span className="text-muted-xs">Plant Lifecycle Follow-Up</span>
          </div>
          <h1 className="tracking-title">Part Request Tracking & Shift Logs</h1>
          <p className="tracking-sub">
            Record engineering follow-up notes, vendor communications, and status updates locally.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/app/requests/new/machine')}
        >
          <span>Start a Part Search</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Split Grid: Request List on Left, Active Tracking Card on Right */}
      <div className="tracking-split-grid">
        {/* Left: Request Selector */}
        <div className="tracking-sidebar-col">
          <div className="panel-card">
            <div className="panel-header">
              <h3 className="panel-title">Active Investigations</h3>
              <span className="counter-badge">{requests.length}</span>
            </div>

            <div className="request-items-selector-list">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className={`req-nav-card ${req.id === currentRequest.id ? 'selected' : ''}`}
                  onClick={() => setSelectedRequestId(req.id)}
                >
                  <div className="req-nav-top">
                    <span className="tech-font font-semibold">{req.requestNumber}</span>
                    <span className={`status-pill ${req.status === 'Candidates Found' ? 'status-pill-teal' : 'status-pill-amber'}`}>
                      {req.status}
                    </span>
                  </div>
                  <h4 className="req-nav-title">{req.partName}</h4>
                  <div className="req-nav-sub">{req.machineName}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Selected Request Detail, Status Stepper & Shift Notes */}
        <div className="tracking-content-col">
          <div className="panel-card">
            {/* Request Summary Top */}
            <div className="tracking-banner-info">
              <div className="banner-top-line">
                <span className="badge-tag live-cad">{currentRequest.requestNumber}</span>
                <span className="tech-font text-muted-xs">Created: {currentRequest.createdAt}</span>
              </div>
              <h2 className="tracking-req-title">{currentRequest.partName}</h2>
              <div className="tracking-meta-row">
                <span>OEM PN: <strong className="tech-font">{currentRequest.originalPartNumber}</strong></span>
                <span>•</span>
                <span>Machine: <strong>{currentRequest.machineName}</strong></span>
                <span>•</span>
                <span>Quantity: <strong>{currentRequest.quantityNeeded} units</strong></span>
              </div>
            </div>

            {/* Interactive Status Stepper */}
            <div className="status-stepper-box">
              <span className="stepper-label">PROGRESSION STATUS (CLICK TO UPDATE LOCAL STATE):</span>
              <div className="stepper-pills-row">
                {statuses.map((st, index) => {
                  const currentIdx = statuses.indexOf(currentRequest.status);
                  const isCurrent = st === currentRequest.status;
                  const isPast = index < currentIdx;

                  return (
                    <button
                      key={st}
                      type="button"
                      className={`stepper-pill ${isCurrent ? 'active' : isPast ? 'past' : ''}`}
                      onClick={() => updateRequestStatus(currentRequest.id, st)}
                      title={`Change status to ${st}`}
                    >
                      <span className="step-num">{index + 1}</span>
                      <span className="step-txt">{st}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Add Maintenance Shift Note Form */}
            <form onSubmit={handleNoteSubmit} className="add-note-card mt-6">
              <label className="form-label" htmlFor="shift-note-input">
                <MessageSquare size={15} className="text-teal" />
                <span>Add Maintenance Follow-Up or Vendor Log Entry</span>
              </label>
              <textarea
                id="shift-note-input"
                className="form-textarea"
                rows={3}
                placeholder="e.g. Spoke with McMaster-Carr rep at 10:15 AM. 2x ifm IGT205 sensors confirmed on shelf and dispatched via Next-Day Air tracking #1Z998234."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                required
              />
              <div className="add-note-footer">
                <span className="text-muted-xs">
                  Posting as: <strong>{currentUser.name}</strong> ({currentUser.roleTitle})
                </span>
                <button type="submit" className="btn btn-primary btn-sm">
                  <Send size={13} />
                  <span>Record Shift Note</span>
                </button>
              </div>
            </form>

            {/* Shift Notes Timeline Feed */}
            <div className="notes-feed-container mt-6">
              <div className="feed-header">
                <Clock size={16} className="text-muted" />
                <h4 className="feed-title">Recorded Investigation Timeline ({currentRequest.trackingNotes.length})</h4>
              </div>

              <div className="tracking-timeline-list">
                {currentRequest.trackingNotes.map((note, idx) => (
                  <div key={idx} className="timeline-note-entry">
                    <div className="note-dot"></div>
                    <div className="note-card-inner">
                      <div className="note-meta-line">
                        <span className="note-author font-semibold">{note.author}</span>
                        <span className="note-time tech-font text-muted-xs">{note.timestamp}</span>
                      </div>
                      <p className="note-body-text">{note.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
