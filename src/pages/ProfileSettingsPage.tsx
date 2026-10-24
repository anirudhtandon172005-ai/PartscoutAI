import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DemoBadge } from '../components/DemoBadge';
import {
  User,
  Building,
  Settings,
  Bell,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  Save,
} from 'lucide-react';

export const ProfileSettingsPage: React.FC = () => {
  const { currentUser, userRole, setUserRole, addToast } = useApp();

  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [notifyLineDown, setNotifyLineDown] = useState(true);
  const [notifyStaleStock, setNotifyStaleStock] = useState(true);
  const [autoVerifyConfidence, setAutoVerifyConfidence] = useState(90);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('Preferences Saved', 'Engineering plant preferences updated in local state.', 'success');
  };

  return (
    <div className="settings-page-root">
      {/* Top Banner Notice */}
      <DemoBadge variant="banner" lastChecked="Local Settings" />

      {/* Header */}
      <div className="settings-header-row">
        <div>
          <div className="kicker-line">
            <span className="badge-tag live-cad">USER CONSOLE & PREFERENCES</span>
            <span className="text-muted-xs">Plant Site B4</span>
          </div>
          <h1 className="settings-title">Profile & Engineering Settings</h1>
          <p className="settings-sub">
            Configure technical unit preferences, notification alerts, and active role persona.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="settings-form-container">
        {/* Profile Card */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title-group">
              <User size={18} className="text-teal" />
              <h3 className="panel-title">Active Engineering Persona</h3>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group col-6">
              <label className="form-label">Full Name</label>
              <input type="text" className="form-input" value={currentUser.name} readOnly />
            </div>
            <div className="form-group col-6">
              <label className="form-label">Plant Email Address</label>
              <input type="email" className="form-input" value={currentUser.email} readOnly />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group col-6">
              <label className="form-label">Organizational Role</label>
              <input type="text" className="form-input" value={currentUser.roleTitle} readOnly />
            </div>
            <div className="form-group col-6">
              <label className="form-label">Assigned Facility / Plant Site</label>
              <input type="text" className="form-input" value={currentUser.plantSite} readOnly />
            </div>
          </div>
        </div>

        {/* Engineering Preferences Card */}
        <div className="panel-card mt-6">
          <div className="panel-header">
            <div className="panel-title-group">
              <Sliders size={18} className="text-teal" />
              <h3 className="panel-title">Technical Parameter Display Preferences</h3>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Primary Measurement System</label>
            <div className="radio-group-row">
              <label className="radio-label">
                <input
                  type="radio"
                  name="unitSystem"
                  checked={unitSystem === 'metric'}
                  onChange={() => setUnitSystem('metric')}
                />
                <span>Metric (ISO Standard - mm, bar, °C, metric thread M18x1.0)</span>
              </label>
              <label className="radio-label ml-6">
                <input
                  type="radio"
                  name="unitSystem"
                  checked={unitSystem === 'imperial'}
                  onChange={() => setUnitSystem('imperial')}
                />
                <span>Imperial (US Customary - inches, psi, °F, NPT)</span>
              </label>
            </div>
          </div>

          <div className="form-group mt-4">
            <label className="form-label" htmlFor="min-conf">
              Automatic High-Confidence Match Threshold ({autoVerifyConfidence}%)
            </label>
            <input
              id="min-conf"
              type="range"
              min="75"
              max="99"
              value={autoVerifyConfidence}
              onChange={(e) => setAutoVerifyConfidence(Number(e.target.value))}
              className="form-range"
            />
            <span className="field-hint">
              Candidates scoring above this threshold are marked "Drop-in Replacement" automatically.
            </span>
          </div>
        </div>

        {/* Plant Alerts & Notifications */}
        <div className="panel-card mt-6">
          <div className="panel-header">
            <div className="panel-title-group">
              <Bell size={18} className="text-teal" />
              <h3 className="panel-title">Plant Alerts & Stale Inventory Warnings</h3>
            </div>
          </div>

          <div className="checkbox-list">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={notifyLineDown}
                onChange={(e) => setNotifyLineDown(e.target.checked)}
              />
              <span className="checkbox-label">
                <strong>Critical Line-Down Priority Alerts:</strong> Highlight requests flagged for urgent factory line interruptions.
              </span>
            </label>

            <label className="checkbox-container mt-3">
              <input
                type="checkbox"
                checked={notifyStaleStock}
                onChange={(e) => setNotifyStaleStock(e.target.checked)}
              />
              <span className="checkbox-label">
                <strong>Stale Observation Warning Banners:</strong> Display safety warnings on supplier quotes older than 24 hours.
              </span>
            </label>
          </div>

          <div className="settings-submit-footer mt-6">
            <button type="submit" className="btn btn-primary">
              <Save size={15} />
              <span>Save Engineering Preferences</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
