import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DemoBadge } from '../components/DemoBadge';
import {
  Building2,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  Mail,
  ArrowRight,
  Filter,
} from 'lucide-react';

export const SupplierDirectoryPage: React.FC = () => {
  const { suppliers, navigate } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredSuppliers = suppliers.filter((s) => {
    if (typeFilter !== 'all' && s.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.domain.toLowerCase().includes(q) ||
        s.headquarters.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="supplier-directory-root">
      {/* Top Banner Notice */}
      <DemoBadge variant="banner" lastChecked="Directory Cache 12:45 UTC" />

      {/* Header */}
      <div className="supplier-header-row">
        <div>
          <div className="kicker-line">
            <span className="badge-tag live-cad">AUTHORIZED INDUSTRIAL NETWORK</span>
            <span className="text-muted-xs">MRO & Automation Distributors</span>
          </div>
          <h1 className="supplier-dir-title">Supplier & Distributor Directory</h1>
          <p className="supplier-dir-sub">
            Verified distributors, franchised partners, and surplus stockists indexed in PartScout AI.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline"
          onClick={() => navigate('/app/quotes')}
        >
          <span>View Active RFQ Quotations</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Directory Disclaimer */}
      <div className="directory-disclaimer-card">
        <AlertTriangle size={16} className="text-amber" />
        <div className="disclaimer-text">
          <strong>Directory Honesty Policy:</strong> All contact information and fulfillment scores represent illustrative public directory records. PartScout AI does not verify live customer service availability or endorse external vendor terms.
        </div>
      </div>

      {/* Search and Filter Toolbar */}
      <div className="results-toolbar">
        <div className="toolbar-search-box">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search suppliers by name, domain, or specialty..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="toolbar-controls-row">
          <div className="filter-group">
            <label className="filter-label" htmlFor="supplier-type-filter">Supplier Type:</label>
            <select
              id="supplier-type-filter"
              className="toolbar-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Supplier Categories</option>
              <option value="Authorized Distributor">Authorized Franchised Distributors</option>
              <option value="Specialist Stockist">Specialist Surplus / Obsolete Stockists</option>
              <option value="Direct Manufacturer">Direct Equipment Manufacturers</option>
            </select>
          </div>
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="suppliers-cards-grid">
        {filteredSuppliers.map((supplier) => (
          <div key={supplier.id} className="supplier-card">
            <div className="supplier-card-header">
              <div>
                <span className="supplier-type-pill">{supplier.type}</span>
                <h3 className="supplier-card-name">{supplier.name}</h3>
                <span className="supplier-domain-tag tech-font">{supplier.domain}</span>
              </div>
              {supplier.verifiedPartner && (
                <span className="verified-partner-tag" title="Franchised manufacturer distributor partner">
                  <ShieldCheck size={14} className="text-teal" /> Verified
                </span>
              )}
            </div>

            <p className="supplier-card-desc">{supplier.description}</p>

            <div className="supplier-metrics-bar">
              <div className="supp-metric-item">
                <span className="metric-k">Reliability:</span>
                <strong className="metric-v text-teal tech-font">{supplier.inventoryReliabilityScore}%</strong>
              </div>
              <div className="supp-metric-item">
                <span className="metric-k">Avg Delivery:</span>
                <strong className="metric-v tech-font">{supplier.averageFulfillmentDays} Days</strong>
              </div>
              <div className="supp-metric-item">
                <span className="metric-k">HQ:</span>
                <span className="metric-v">{supplier.headquarters}</span>
              </div>
            </div>

            <div className="supplier-card-footer">
              <button
                type="button"
                className="btn btn-primary btn-sm btn-block"
                onClick={() => navigate(`/app/suppliers/${supplier.id}`)}
              >
                <span>View Supplier Profile & Listings</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
