import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DemoBadge } from '../components/DemoBadge';
import { DEMO_SEARCH_ID } from '../data/mockData';
import {
  Building2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowRight,
  FileSpreadsheet,
  X,
  Send,
  HelpCircle,
} from 'lucide-react';

export const SupplierDetailPage: React.FC<{ supplierId?: string }> = ({ supplierId = 'supp-mcmaster' }) => {
  const { suppliers, allParts, navigate, addToast, addQuotation } = useApp();

  const supplier = suppliers.find((s) => s.id === supplierId) || suppliers[0];
  const [showContactModal, setShowContactModal] = useState(false);
  const [rfqPartNumber, setRfqPartNumber] = useState('IGT205');
  const [rfqQuantity, setRfqQuantity] = useState(2);
  const [rfqUrgency, setRfqUrgency] = useState('Line Down (Critical)');
  const [rfqNotes, setRfqNotes] = useState('Need priority dispatch for Apex PackWorks Bottling Line 4.');

  if (!supplier) {
    return (
      <div className="supplier-detail-root">
        <DemoBadge variant="banner" lastChecked="No supplier record" />
        <div className="error-container">
          <AlertTriangle size={48} className="text-amber" />
          <h3>Supplier record unavailable</h3>
          <p>No persisted supplier record was returned for this workspace.</p>
          <button type="button" className="btn btn-primary mt-4" onClick={() => navigate('/app/suppliers')}>
            Return to supplier directory
          </button>
        </div>
      </div>
    );
  }

  // Find all component offers attributed to this persisted supplier.
  const supplierOffers = allParts.flatMap((part) =>
    part.offers
      .filter((o) => o.supplierId === supplier.id || o.supplierName.includes(supplier.name))
      .map((o) => ({ ...o, partNumber: part.partNumber, partName: part.name, partId: part.id }))
  );

  const handleSimulatedQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addQuotation({
      partRequestId: 'req-2026-line4-sensor',
      partNumber: `${rfqPartNumber} (${supplier.name})`,
      supplierName: supplier.name,
      unitPrice: 108.40,
      currency: 'USD',
      quantity: rfqQuantity,
      totalPrice: 108.40 * rfqQuantity,
      leadTimeWeeks: 0.2,
      validUntil: '2026-11-20',
      terms: 'Net 30. Ground or Next-Day Courier.',
      isOfficial: false,
      status: 'Pending Review',
    });
    setShowContactModal(false);
    addToast(
      'RFQ Draft Recorded',
      `Simulated request for quotation saved to Quotation Management. No live emails dispatched.`,
      'success'
    );
    navigate('/app/quotes');
  };

  return (
    <div className="supplier-detail-root">
      {/* Top Banner Notice */}
      <DemoBadge variant="banner" lastChecked="Simulated Supplier Records" />

      {/* Header */}
      <div className="supp-detail-header">
        <div className="supp-detail-meta">
          <div className="kicker-line">
            <span className="badge-tag live-cad">INDEXED DISTRIBUTOR PROFILE</span>
            <span className="text-muted-xs">Entity ID: {supplier.id}</span>
          </div>
          <h1 className="supp-name-headline">{supplier.name}</h1>
          <div className="supp-sub-row">
            <span className="supplier-type-pill">{supplier.type}</span>
            <span className="supp-domain-link tech-font">{supplier.domain}</span>
            {supplier.verifiedPartner && (
              <span className="verified-partner-tag">
                <ShieldCheck size={14} className="text-teal" /> Verified Partner
              </span>
            )}
          </div>
        </div>

        <div className="supp-header-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => window.open(supplier.websiteUrl, '_blank')}
            title="Open supplier's website in a new tab"
          >
            <span>Open Supplier Website</span>
            <ExternalLink size={14} />
          </button>

          <button
            type="button"
            className="btn btn-primary shadow-lift"
            onClick={() => setShowContactModal(true)}
          >
            <Send size={15} />
            <span>Simulate RFQ Contact Handoff</span>
          </button>
        </div>
      </div>

      {/* Honesty and Disclaimer Banner */}
      <div className="supplier-disclaimer-box">
        <AlertTriangle size={16} className="text-amber" />
        <div className="disclaimer-text">
          <strong>Supplier Data Integrity Notice:</strong> {supplier.contactDisclaimer}
        </div>
      </div>

      {/* Main Grid: Details on Left, Offer Catalog on Right */}
      <div className="supp-main-grid">
        {/* Left: Contact Info & Operational Metrics */}
        <div className="supp-left-col">
          <div className="panel-card">
            <div className="panel-header">
              <h3 className="panel-title">Supplier Operations</h3>
            </div>
            <div className="supp-operations-list">
              <div className="op-item">
                <span className="op-label">Headquarters:</span>
                <span className="op-value tech-font">{supplier.headquarters} ({supplier.country})</span>
              </div>
              <div className="op-item">
                <span className="op-label">Public Directory Phone:</span>
                <span className="op-value tech-font">{supplier.directPhone || 'Not Listed'}</span>
              </div>
              <div className="op-item">
                <span className="op-label">Public Inquiries Email:</span>
                <span className="op-value tech-font">{supplier.supportEmail || 'Not Listed'}</span>
              </div>
              <div className="op-item">
                <span className="op-label">Avg Fulfillment Speed:</span>
                <span className="op-value tech-font text-teal">{supplier.averageFulfillmentDays} Business Days</span>
              </div>
              <div className="op-item">
                <span className="op-label">Inventory Reliability:</span>
                <span className="op-value tech-font text-teal">{supplier.inventoryReliabilityScore}%</span>
              </div>
            </div>
          </div>

          <div className="panel-card mt-6">
            <div className="panel-header">
              <h3 className="panel-title">About {supplier.name}</h3>
            </div>
            <p className="supp-full-desc">{supplier.description}</p>
          </div>
        </div>

        {/* Right: Indexed Component Offers */}
        <div className="supp-right-col">
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title-group">
                <Building2 size={16} className="text-teal" />
                <h3 className="panel-title">Indexed Product Listings from {supplier.domain}</h3>
              </div>
              <DemoBadge variant="inline" customText="Demo Listings" lastChecked="Simulated Feed" />
            </div>

            <div className="supp-listings-table-container">
              <table className="engineering-table">
                <thead>
                  <tr>
                    <th>Part Number</th>
                    <th>Reported Price</th>
                    <th>Stock Condition</th>
                    <th>Freshness</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierOffers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">
                        No active sample listings mapped to this supplier in current demo state.
                      </td>
                    </tr>
                  ) : (
                    supplierOffers.map((offer) => (
                      <tr key={offer.id}>
                        <td>
                          <span className="tech-font font-semibold text-primary">{offer.partNumber}</span>
                          <div className="text-muted-xs">{offer.partName}</div>
                        </td>
                        <td>
                          <span className="tech-font font-semibold text-lg">
                            ${offer.reportedPrice.toFixed(2)}
                          </span>
                          <div className="text-muted-xs">{offer.currency}</div>
                        </td>
                        <td>
                          <span className={`status-pill ${offer.stockStatus === 'In Stock' ? 'status-pill-teal' : 'status-pill-amber'}`}>
                            {offer.stockStatus}
                          </span>
                          <div className="text-muted-xs tech-font">
                            {offer.quantityAvailable ? `${offer.quantityAvailable} units` : 'Inquire'}
                          </div>
                        </td>
                        <td>
                          <span className={`freshness-badge freshness-${offer.freshness}`}>
                            {offer.freshness === 'fresh' ? 'Fresh < 4h' : 'Stale > 24h'}
                          </span>
                          <div className="text-muted-xs tech-font">{offer.lastChecked}</div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-outline btn-xs"
                            onClick={() => navigate(`/app/search/${DEMO_SEARCH_ID}/parts/${offer.partId}`)}
                          >
                            <span>Inspect 3D</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Simulated Contact Handoff Modal (Safe, honest prototype behavior!) */}
      {showContactModal && (
        <div className="modal-overlay" onClick={() => setShowContactModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="badge-tag live-cad">PROTOTYPE RFQ HANDOFF</span>
                <h3 className="modal-title">Simulate Quote Request to {supplier.name}</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowContactModal(false)}
                aria-label="Close Modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSimulatedQuoteSubmit} className="modal-body">
              <div className="modal-notice-card">
                <AlertTriangle size={15} className="text-amber" />
                <div className="notice-body">
                  <strong>Simulated Action:</strong> In this UI prototype, submitting this form will record an illustrative quotation in your local workspace. No email, API call, or web transmission is sent to {supplier.name}.
                </div>
              </div>

              <div className="form-row mt-4">
                <div className="form-group col-6">
                  <label className="form-label">Part Number Required</label>
                  <input
                    type="text"
                    className="form-input tech-font"
                    value={rfqPartNumber}
                    onChange={(e) => setRfqPartNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group col-6">
                  <label className="form-label">Quantity Needed</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={rfqQuantity}
                    onChange={(e) => setRfqQuantity(parseInt(e.target.value) || 1)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Urgency & Delivery Requirement</label>
                <select
                  className="form-select"
                  value={rfqUrgency}
                  onChange={(e) => setRfqUrgency(e.target.value)}
                >
                  <option value="Line Down (Critical)">Line Down (Critical - Next Flight Out)</option>
                  <option value="Urgent (24-48h)">Urgent (24-48 Hours)</option>
                  <option value="Planned Maintenance">Planned Maintenance Shutdown</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Delivery Notes / Receiving Dock Instructions</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={rfqNotes}
                  onChange={(e) => setRfqNotes(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowContactModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <span>Record Illustrative Quote in Workspace</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
