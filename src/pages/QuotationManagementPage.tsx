import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DemoBadge } from '../components/DemoBadge';
import {
  FileSpreadsheet,
  PlusCircle,
  Building,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  DollarSign,
  Calendar,
  X,
  AlertTriangle,
} from 'lucide-react';

export const QuotationManagementPage: React.FC = () => {
  const { quotations, addQuotation, updateQuotationStatus, navigate, addToast } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [supplierName, setSupplierName] = useState('AutomationDirect');
  const [partNumber, setPartNumber] = useState('IGT205');
  const [unitPrice, setUnitPrice] = useState(89.50);
  const [quantity, setQuantity] = useState(2);
  const [leadTimeWeeks, setLeadTimeWeeks] = useState(0.2);
  const [terms, setTerms] = useState('Net 30. Ground shipping included.');

  const handleAddQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addQuotation({
      partRequestId: 'req-2026-line4-sensor',
      partNumber,
      supplierName,
      unitPrice,
      currency: 'USD',
      quantity,
      totalPrice: unitPrice * quantity,
      leadTimeWeeks,
      validUntil: '2026-11-20',
      terms,
      isOfficial: false,
      status: 'Pending Review',
    });
    setShowAddModal(false);
    addToast('Quote Added', `Illustrative quote from ${supplierName} recorded.`, 'success');
  };

  return (
    <div className="quotes-page-root">
      {/* Top Banner Notice */}
      <DemoBadge variant="banner" lastChecked="Simulated Quotation Engine" />

      {/* Header */}
      <div className="quotes-header-row">
        <div>
          <div className="kicker-line">
            <span className="badge-tag live-cad">PROCUREMENT RFQ CONSOLE</span>
            <span className="text-muted-xs">Illustrative Quotations</span>
          </div>
          <h1 className="quotes-title">Quotation Comparison & Management</h1>
          <p className="quotes-sub">
            Review and compare vendor price proposals, lead times, and terms for active requests.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          <PlusCircle size={16} />
          <span>Add Illustrative Quote</span>
        </button>
      </div>

      {/* Quotation Comparison Table */}
      <div className="panel-card">
        <div className="panel-header">
          <div className="panel-title-group">
            <FileSpreadsheet size={18} className="text-teal" />
            <h3 className="panel-title">Active Quotation Bids ({quotations.length})</h3>
          </div>
          <DemoBadge variant="inline" customText="Sample Quotes" lastChecked="Local Store" />
        </div>

        <div className="quotes-table-wrapper">
          <table className="engineering-table">
            <thead>
              <tr>
                <th>RFQ Number & Date</th>
                <th>Supplier & Vendor</th>
                <th>Offered Part</th>
                <th>Unit Price</th>
                <th>Qty</th>
                <th>Total Price</th>
                <th>Lead Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((quote) => (
                <tr key={quote.id}>
                  <td>
                    <span className="tech-font font-semibold text-primary">{quote.rfqNumber}</span>
                    <div className="text-muted-xs">{quote.quotedAt.split(' ')[0]}</div>
                  </td>
                  <td>
                    <strong className="text-sm">{quote.supplierName}</strong>
                    <div className="text-muted-xs">{quote.terms}</div>
                  </td>
                  <td>
                    <span className="tech-font font-medium">{quote.partNumber}</span>
                  </td>
                  <td>
                    <span className="tech-font font-semibold text-base">${quote.unitPrice.toFixed(2)}</span>
                    <span className="text-muted-xs"> {quote.currency}</span>
                  </td>
                  <td>
                    <span className="tech-font font-semibold">{quote.quantity}</span>
                  </td>
                  <td>
                    <span className="tech-font font-bold text-lg text-teal">
                      ${quote.totalPrice.toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <div className="tech-font font-medium">
                      {quote.leadTimeWeeks < 0.3 ? '1-2 Days (Priority)' : `${Math.round(quote.leadTimeWeeks * 7)} Days`}
                    </div>
                    <span className="text-muted-xs">Valid until {quote.validUntil}</span>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        quote.status === 'Accepted'
                          ? 'status-pill-teal'
                          : quote.status === 'Declined'
                          ? 'status-pill-neutral'
                          : 'status-pill-amber'
                      }`}
                    >
                      {quote.status}
                    </span>
                  </td>
                  <td>
                    <div className="quote-action-btns">
                      {quote.status !== 'Accepted' && (
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => updateQuotationStatus(quote.id, 'Accepted')}
                        >
                          <CheckCircle2 size={12} className="text-teal" />
                          <span>Accept</span>
                        </button>
                      )}
                      {quote.status !== 'Declined' && (
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => updateQuotationStatus(quote.id, 'Declined')}
                        >
                          <XCircle size={12} className="text-muted" />
                          <span>Decline</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Quotation Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Illustrative Supplier Quotation</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddQuoteSubmit} className="modal-body">
              <div className="form-row">
                <div className="form-group col-6">
                  <label className="form-label">Supplier / Distributor Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group col-6">
                  <label className="form-label">Offered Part Number *</label>
                  <input
                    type="text"
                    className="form-input tech-font"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group col-4">
                  <label className="form-label">Unit Price ($ USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    className="form-input tech-font"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div className="form-group col-4">
                  <label className="form-label">Quantity Needed *</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    required
                  />
                </div>
                <div className="form-group col-4">
                  <label className="form-label">Lead Time (Weeks) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    className="form-input"
                    value={leadTimeWeeks}
                    onChange={(e) => setLeadTimeWeeks(parseFloat(e.target.value) || 0.1)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment & Delivery Terms</label>
                <input
                  type="text"
                  className="form-input"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <span>Save Quotation to Workspace</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
