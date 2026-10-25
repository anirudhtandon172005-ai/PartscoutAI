import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DemoBadge } from '../components/DemoBadge';
import { DEMO_SEARCH_ID } from '../data/mockData';
import {
  CheckSquare,
  AlertTriangle,
  Building,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  PlusCircle,
  Scale,
  RotateCcw,
} from 'lucide-react';

export const AvailabilityStockPage: React.FC<{ partId?: string }> = ({ partId = 'part-ifm-igt205' }) => {
  const { allParts, navigate, addQuotation, addToast, draftRequest } = useApp();

  // This legacy route has no search ID, so it cannot safely fetch a persisted
  // candidate. It may show fixture inventory only in explicit demo mode.
  const component = import.meta.env.VITE_DEMO_MODE === 'true'
    ? allParts.find((p) => p.id === partId)
    : undefined;
  const quantityNeeded = draftRequest.quantityNeeded || 2;

  if (!component) {
    return (
      <div className="availability-page-root">
        <DemoBadge variant="banner" lastChecked="Live availability unavailable" />
        <div className="error-container">
          <AlertTriangle size={48} className="text-amber" />
          <h3>No live availability data</h3>
          <p>Stock and pricing must be retrieved for this candidate before they can be displayed.</p>
          <button type="button" className="btn btn-primary mt-4" onClick={() => navigate('/app/dashboard')}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleAddToQuotes = (offer: typeof component.offers[0]) => {
    addQuotation({
      partRequestId: 'req-2026-line4-sensor',
      partNumber: `${component.partNumber} (${offer.supplierName})`,
      supplierName: offer.supplierName,
      unitPrice: offer.reportedPrice,
      currency: offer.currency,
      quantity: quantityNeeded,
      totalPrice: offer.reportedPrice * quantityNeeded,
      leadTimeWeeks: offer.leadTimeDays / 7,
      validUntil: null,
      terms: 'Pending supplier confirmation.',
      isOfficial: false,
      status: 'Pending Review',
    });
    addToast('Added to Quotation Management', `Recorded ${offer.supplierName} offer for comparison.`, 'success');
  };

  return (
    <div className="availability-page-root">
      {/* Top Banner Notice */}
      <DemoBadge variant="banner" lastChecked="Live Distributor Feed" />

      {/* Header */}
      <div className="avail-header-row">
        <div>
          <div className="kicker-line">
            <span className="badge-tag live-cad">AGGREGATED SUPPLIER STOCK INTELLIGENCE</span>
            <span className="text-muted-xs">Quantity Needed: {quantityNeeded} units</span>
          </div>
          <h1 className="avail-title">Stock & Availability: {component.partNumber}</h1>
          <p className="avail-sub">
            {component.name} • {component.manufacturer} • <strong>{component.matchScore}% Match</strong>
          </p>
        </div>

        <div className="avail-top-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(`/app/search/${DEMO_SEARCH_ID}/compare/${component.id}`)}
          >
            <Scale size={15} />
            <span>Compare Specs</span>
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/app/quotes')}
          >
            <span>View All Quotations</span>
          </button>
        </div>
      </div>

      {/* STALE STOCK MANDATORY WARNING BANNER */}
      <div className="stock-stale-alert-banner">
        <AlertTriangle size={20} className="warning-icon" />
        <div className="warning-content">
          <h4 className="warning-title">Supplier Stock & Pricing Volatility Warning</h4>
          <p className="warning-body">
            Distributor shelf quantities, spot pricing, and surplus lots can fluctuate rapidly between crawler sync intervals. <strong>Always call or confirm live order allocation directly with the supplier</strong> before relying on these figures for critical factory downtime windows.
          </p>
        </div>
      </div>

      {/* Offers Comparison Matrix */}
      <div className="panel-card mt-6">
        <div className="panel-header">
          <div className="panel-title-group">
            <Building size={18} className="text-teal" />
            <h3 className="panel-title">Active Reported Supplier Offers</h3>
          </div>
          <span className="counter-badge">{component.offers.length} Options Listed</span>
        </div>

        <div className="offers-table-wrapper">
          <table className="engineering-table">
            <thead>
              <tr>
                <th>Distributor / Source</th>
                <th>Stock Status</th>
                <th>Reported Unit Price</th>
                <th>Total for {quantityNeeded} Units</th>
                <th>Lead Time & Terms</th>
                <th>Source Freshness</th>
                <th>Procurement Action</th>
              </tr>
            </thead>
            <tbody>
              {component.offers.map((offer) => {
                const totalCost = offer.reportedPrice * quantityNeeded;

                return (
                  <tr key={offer.id}>
                    <td>
                      <div className="font-semibold text-primary">{offer.supplierName}</div>
                      <div className="text-muted-xs tech-font">{offer.supplierDomain} • {offer.location}</div>
                      {offer.notes && <div className="offer-note-sm mt-1">{offer.notes}</div>}
                    </td>

                    <td>
                      <span className={`status-pill ${offer.stockStatus === 'In Stock' ? 'status-pill-teal' : 'status-pill-amber'}`}>
                        {offer.stockStatus}
                      </span>
                      <div className="text-muted-xs tech-font mt-1">
                        {offer.quantityAvailable ? `${offer.quantityAvailable} units on shelf` : 'Inquire for lot'}
                      </div>
                    </td>

                    <td>
                      <span className="tech-font font-semibold text-lg">
                        {offer.currency} {offer.reportedPrice.toFixed(2)}
                      </span>
                      <div className="text-muted-xs">{offer.currency} / unit</div>
                    </td>

                    <td>
                      <span className="tech-font font-bold text-lg text-teal">
                        {offer.currency} {totalCost.toFixed(2)}
                      </span>
                      <div className="text-muted-xs">Estimated Pre-Tax</div>
                    </td>

                    <td>
                      <div className="tech-font font-medium">
                        {offer.leadTimeDays === 1 ? '1 Day (Next Day Dispatch)' : `${offer.leadTimeDays} Days`}
                      </div>
                      <span className="text-muted-xs">MOQ: {offer.minOrderQuantity} unit</span>
                    </td>

                    <td>
                      <span className={`freshness-badge freshness-${offer.freshness}`}>
                        {offer.freshness === 'fresh' ? 'Fresh < 4h' : 'Stale > 24h'}
                      </span>
                      <div className="text-muted-xs tech-font mt-1">{offer.lastChecked}</div>
                    </td>

                    <td>
                      <div className="offer-row-btns">
                        <button
                          type="button"
                          className="btn btn-primary btn-xs"
                          onClick={() => handleAddToQuotes(offer)}
                        >
                          <PlusCircle size={12} />
                          <span>Add to RFQ</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => navigate(`/app/suppliers/${offer.supplierId}`)}
                        >
                          <span>Supplier Details</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
