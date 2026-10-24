import React, { useState } from 'react';
import { AlertCircle, Clock, Info } from 'lucide-react';

interface DemoBadgeProps {
  lastChecked?: string;
  variant?: 'inline' | 'pill' | 'banner' | 'timestamp-only';
  customText?: string;
}

export const DemoBadge: React.FC<DemoBadgeProps> = ({
  lastChecked = '28 minutes ago',
  variant = 'pill',
  customText = 'Demo Data',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (variant === 'timestamp-only') {
    return (
      <span className="timestamp-badge" title="Source observation time">
        <Clock size={11} className="icon-clock" />
        <span>Checked {lastChecked}</span>
      </span>
    );
  }

  if (variant === 'banner') {
    return (
      <div className="demo-notice-banner">
        <div className="banner-content">
          <Info size={16} className="text-amber" />
          <div className="banner-text">
            <strong>Illustrative Prototype Data:</strong> Stock quantities, prices, supplier listings, and crawler observations shown are realistic engineering samples. PartScout AI does not claim live TinyFish crawler connections or certified manufacturer inventory until integrated.
          </div>
        </div>
        <div className="banner-timestamp">
          <Clock size={12} />
          <span>Last sync: {lastChecked}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="demo-badge-container"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className={`demo-badge-tag ${variant}`}>
        <span className="demo-indicator-dot"></span>
        <span className="demo-text">{customText}</span>
        {lastChecked && (
          <span className="demo-time">
            • <Clock size={10} /> {lastChecked}
          </span>
        )}
      </span>

      {showTooltip && (
        <div className="demo-tooltip-popover">
          <div className="tooltip-title">
            <AlertCircle size={13} className="text-amber" />
            <span>Illustrative Prototype Data</span>
          </div>
          <p className="tooltip-desc">
            This figure reflects sample catalog research for interface demonstration. Always confirm pricing, lead time, and physical availability directly with the verified supplier.
          </p>
          <div className="tooltip-meta">Observation benchmark: {lastChecked}</div>
        </div>
      )}
    </div>
  );
};
