import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DemoBadge } from '../components/DemoBadge';
import {
  History,
  Search,
  Building,
  AlertTriangle,
  ArrowRight,
  Filter,
  Clock,
  RotateCcw,
} from 'lucide-react';

export const RequestHistoryPage: React.FC = () => {
  const { requests, navigate } = useApp();

  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRequests = requests.filter((r) => {
    if (urgencyFilter !== 'all' && r.urgency !== urgencyFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.requestNumber.toLowerCase().includes(q) ||
        r.partName.toLowerCase().includes(q) ||
        r.originalPartNumber.toLowerCase().includes(q) ||
        r.machineName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="history-page-root">
      {/* Top Banner Notice */}
      <DemoBadge variant="banner" lastChecked="Local History Records" />

      {/* Header */}
      <div className="history-header-row">
        <div>
          <div className="kicker-line">
            <span className="badge-tag live-cad">PLANT SOURCING LOG</span>
            <span className="text-muted-xs">Audit History</span>
          </div>
          <h1 className="history-title">Part Sourcing Request History</h1>
          <p className="history-sub">
            Track historical spare part investigations across all plant production lines.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/app/requests/new/machine')}
        >
          <span>Start New Request</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="results-toolbar">
        <div className="toolbar-search-box">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search past requests by number, part, or machine..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="toolbar-controls-row">
          <div className="filter-group">
            <label className="filter-label" htmlFor="history-urgency-filter">Filter Urgency:</label>
            <select
              id="history-urgency-filter"
              className="toolbar-select"
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
            >
              <option value="all">All Urgency Levels</option>
              <option value="Line Down (Critical)">Line Down (Critical)</option>
              <option value="Planned Maintenance">Planned Maintenance</option>
              <option value="Standard Restock">Standard Restock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests History Table */}
      <div className="panel-card">
        <div className="panel-header">
          <div className="panel-title-group">
            <History size={18} className="text-teal" />
            <h3 className="panel-title">Completed & In-Progress Searches</h3>
          </div>
          <span className="counter-badge">{filteredRequests.length} Requests</span>
        </div>

        <div className="history-table-wrapper">
          <table className="engineering-table">
            <thead>
              <tr>
                <th>Request ID & Date</th>
                <th>Target Component</th>
                <th>Machine & Facility</th>
                <th>Quantity</th>
                <th>Urgency</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => (
                <tr key={req.id}>
                  <td>
                    <span className="tech-font font-semibold text-primary">{req.requestNumber}</span>
                    <div className="text-muted-xs">{req.createdAt}</div>
                  </td>
                  <td>
                    <div className="font-semibold">{req.partName}</div>
                    <span className="tech-font text-muted-xs">OEM: {req.originalPartNumber}</span>
                  </td>
                  <td>
                    <div className="font-medium">{req.machineName}</div>
                    <span className="text-muted-xs">{req.customRequirements.substring(0, 48)}...</span>
                  </td>
                  <td>
                    <span className="tech-font font-semibold">{req.quantityNeeded}</span>
                  </td>
                  <td>
                    <span className={`status-pill ${req.urgency.includes('Critical') ? 'status-pill-amber' : 'status-pill-neutral'}`}>
                      {req.urgency}
                    </span>
                  </td>
                  <td>
                    <span className="status-pill status-pill-teal">{req.status}</span>
                  </td>
                  <td>
                    <div className="history-action-btns">
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() => navigate(`/app/results/${req.id}`)}
                      >
                        <span>View Intel</span>
                        <ArrowRight size={11} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        onClick={() => navigate('/app/tracking')}
                      >
                        <span>Tracking</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
