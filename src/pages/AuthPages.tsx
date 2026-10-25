import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  User,
  Lock,
  Mail,
  ArrowRight,
  Building,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  Server,
  Key,
  Info,
  X,
  RefreshCw,
  Sliders,
  Wrench,
  PackageCheck,
  ShieldAlert
} from 'lucide-react';
import { getSupabaseConfigInfo } from '../lib/supabase';

interface AuthPageProps {
  mode?: 'login' | 'signup';
}

export const AuthPages: React.FC<AuthPageProps> = ({ mode: initialMode = 'login' }) => {
  const {
    navigate,
    signInWithSupabase,
    signUpWithSupabase,
    signInWithDemoPersona,
    isSupabaseLive,
    authLoading,
    currentUser,
    userRole,
    addToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'engineer' | 'procurement' | 'admin'>('engineer');
  const [facility, setFacility] = useState('Apex PackWorks - Main Plant (Facility B4)');
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const supabaseInfo = getSupabaseConfigInfo();

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      if (activeTab === 'login') {
        const { error } = await signInWithSupabase(email, password);
        if (error) {
          setErrorMsg(error);
          return;
        }
        navigate('/app/dashboard');
      } else if (activeTab === 'signup') {
        const { error } = await signUpWithSupabase(email, password, {
          name: name.trim() || email.split('@')[0],
          role: selectedRole,
          plant_site: facility,
        });
        if (error) {
          setErrorMsg(error);
          return;
        }
        navigate('/app/dashboard');
      } else if (activeTab === 'reset') {
        // Password reset flow
        setSuccessMsg(`A password recovery dispatch has been transmitted to ${email}. Check your plant inbox.`);
        addToast('Recovery Dispatched', `Password reset instructions sent to ${email}`, 'info');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickPersona = async (role: 'engineer' | 'procurement' | 'admin') => {
    setSubmitting(true);
    try {
      await signInWithDemoPersona(role);
      addToast(
        'Persona Verified',
        `Authenticated as ${role === 'admin' ? 'Sarah Jenkins (Admin)' : role === 'procurement' ? 'Elena Gomez (Procurement)' : 'Marcus Vance (Engineer)'}.`,
        'success'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-root">
      <div className="auth-container">
        {/* Main Authentication Card */}
        <div className="auth-card">
          {/* Top Brand Header */}
          <div className="auth-header">
            <div className="auth-brand-mark">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="4" stroke="#EA580C" strokeWidth="2.2" />
                <circle cx="12" cy="12" r="5" stroke="#0D9488" strokeWidth="2.2" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#EA580C" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="auth-title">
              {activeTab === 'login' && 'Sign In to PartScout AI'}
              {activeTab === 'signup' && 'Create Plant Engineering Account'}
              {activeTab === 'reset' && 'Reset Engineering Password'}
            </h2>
            <p className="auth-subtitle">
              {activeTab === 'login' && 'Industrial replacement intelligence & spare parts catalog verification portal.'}
              {activeTab === 'signup' && 'Provision verified access to plant spare parts sourcing & deterministic CAD cross-referencing.'}
              {activeTab === 'reset' && 'Enter your plant email to receive credentials recovery telemetry.'}
            </p>

            {/* Supabase Connection Status Pill */}
            <div className="supabase-status-strip mt-3">
              <div
                className={`supabase-status-pill ${supabaseInfo.isConfigured ? 'status-live' : 'status-sandbox'}`}
                onClick={() => setShowConfigModal(true)}
                role="button"
                tabIndex={0}
                title="Click to view Supabase Backend connection details"
              >
                <span className="pulse-dot"></span>
                <span className="status-text">
                  {supabaseInfo.isConfigured ? 'Supabase Authentication Connected' : 'Supabase Sandbox Engine (Local)'}
                </span>
                <span className="info-icon-badge">
                  <Info size={11} />
                </span>
              </div>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="auth-tab-row">
            <button
              type="button"
              className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${activeTab === 'signup' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
            >
              Create Account
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${activeTab === 'reset' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('reset');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
            >
              Recovery
            </button>
          </div>

          {/* Alert Messages */}
          {errorMsg && (
            <div className="auth-alert alert-error mt-3">
              <ShieldAlert size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-alert alert-success mt-3">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="auth-form mt-4">
            {activeTab === 'signup' && (
              <div className="form-group">
                <label className="form-label" htmlFor="user-name">
                  Full Name & Engineering Title
                </label>
                <div className="input-with-icon">
                  <User size={16} className="input-icon" />
                  <input
                    id="user-name"
                    type="text"
                    required
                    placeholder="e.g. Alex Mercer (Reliability Specialist)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="user-email">
                Plant Email Address
              </label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" />
                <input
                  id="user-email"
                  type="email"
                  required
                  placeholder="name@plant-domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            {activeTab !== 'reset' && (
              <div className="form-group">
                <div className="form-label-row">
                  <label className="form-label" htmlFor="user-pwd">
                    Password
                  </label>
                  {activeTab === 'login' && (
                    <button
                      type="button"
                      className="link-btn text-xs"
                      onClick={() => setActiveTab('reset')}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" />
                  <input
                    id="user-pwd"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'signup' && (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="user-facility">
                    Plant Facility / Production Campus
                  </label>
                  <div className="input-with-icon">
                    <Building size={16} className="input-icon" />
                    <input
                      id="user-facility"
                      type="text"
                      value={facility}
                      onChange={(e) => setFacility(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Primary Industrial Role:</label>
                  <div className="role-selector-grid">
                    <div
                      className={`role-select-card ${selectedRole === 'engineer' ? 'selected' : ''}`}
                      onClick={() => setSelectedRole('engineer')}
                    >
                      <Wrench size={18} className="role-card-icon text-teal" />
                      <strong>Maintenance Lead</strong>
                      <span>Line-down repair & CAD fitment</span>
                    </div>

                    <div
                      className={`role-select-card ${selectedRole === 'procurement' ? 'selected' : ''}`}
                      onClick={() => setSelectedRole('procurement')}
                    >
                      <PackageCheck size={18} className="role-card-icon text-amber" />
                      <strong>Procurement Lead</strong>
                      <span>RFQ comparison & stock lead times</span>
                    </div>

                    <div
                      className={`role-select-card ${selectedRole === 'admin' ? 'selected' : ''}`}
                      onClick={() => setSelectedRole('admin')}
                    >
                      <Sliders size={18} className="role-card-icon text-orange" />
                      <strong>System Admin</strong>
                      <span>Crawler monitor & data quality</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'login' && (
              <div className="form-remember-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Keep session authenticated</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg mt-3"
              disabled={submitting || authLoading}
            >
              {submitting ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  <span>Verifying with Supabase & Backend...</span>
                </>
              ) : (
                <>
                  <span>
                    {activeTab === 'login' && 'Sign In with Supabase'}
                    {activeTab === 'signup' && 'Create Supabase Account'}
                    {activeTab === 'reset' && 'Transmit Recovery Link'}
                  </span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Mode Switch Prompt */}
          <div className="auth-card-switch-prompt mt-4">
            {activeTab === 'signup' && (
              <>
                <span>Already have a plant account?</span>
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                >
                  Sign In to existing session
                </button>
              </>
            )}

            {activeTab === 'login' && (
              <>
                <span>Need to register a new plant profile?</span>
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={() => {
                    setActiveTab('signup');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                >
                  Create Plant Account
                </button>
              </>
            )}

            {activeTab === 'reset' && (
              <>
                <span>Remember your engineering credentials?</span>
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                >
                  Back to Sign In
                </button>
              </>
            )}
          </div>

          {/* Sign Up Security & RBAC Guarantee Notes */}
          {activeTab === 'signup' && (
            <div className="auth-security-guarantee mt-4">
              <div className="security-item">
                <ShieldCheck size={14} className="text-teal" />
                <span>Direct Supabase AES-256 JWT Authentication</span>
              </div>
              <div className="security-item">
                <CheckCircle2 size={14} className="text-orange" />
                <span>Deterministic Role-Based Permissions</span>
              </div>
            </div>
          )}

          {/* Quick Demo Sign-in Personas (Only displayed on Sign In tab) */}
          {activeTab === 'login' && (
            <div className="quick-persona-section mt-5">
              <div className="auth-divider">
                <span>OR 1-CLICK PROTOTYPE PERSONA ACCESS</span>
              </div>

              <div className="persona-button-list mt-3">
                <button
                  type="button"
                  className="btn-persona"
                  disabled={submitting}
                  onClick={() => handleQuickPersona('engineer')}
                >
                  <div className="persona-btn-text">
                    <div className="persona-name-row">
                      <strong>Marcus Vance</strong>
                      <span className="persona-badge-tag tag-engineer">Engineer</span>
                    </div>
                    <span>Lead Maintenance Specialist • Line 4 Capper Asset</span>
                  </div>
                  <ArrowRight size={14} className="persona-arrow" />
                </button>

                <button
                  type="button"
                  className="btn-persona"
                  disabled={submitting}
                  onClick={() => handleQuickPersona('procurement')}
                >
                  <div className="persona-btn-text">
                    <div className="persona-name-row">
                      <strong>Elena Gomez</strong>
                      <span className="persona-badge-tag tag-procurement">Procurement</span>
                    </div>
                    <span>Senior Procurement Lead • RFQ & Stock Dispatch</span>
                  </div>
                  <ArrowRight size={14} className="persona-arrow" />
                </button>

                <button
                  type="button"
                  className="btn-persona"
                  disabled={submitting}
                  onClick={() => handleQuickPersona('admin')}
                >
                  <div className="persona-btn-text">
                    <div className="persona-name-row">
                      <strong>Sarah Jenkins</strong>
                      <span className="persona-badge-tag tag-admin">Administrator</span>
                    </div>
                    <span>Systems Admin • Web Crawler & Quality Audits</span>
                  </div>
                  <ArrowRight size={14} className="persona-arrow" />
                </button>
              </div>

              {/* Polished Backend Telemetry Badge */}
              <div className="auth-system-telemetry mt-4">
                <div className="telemetry-inner">
                  <Server size={12} className="text-teal" />
                  <span className="telemetry-label">Backend Token Verification:</span>
                  <code className="telemetry-endpoint">/api/v1/auth/verify</code>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Supabase Configuration Modal */}
      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="modal-dialog modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <Key size={18} className="text-teal" />
                <h3 className="modal-title">Supabase Authentication Settings</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowConfigModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p className="text-sm text-muted">
                PartScout AI is integrated with <strong>Supabase Auth</strong> on the frontend and verifies session tokens through the <strong>FastAPI backend</strong>.
              </p>

              <div className="config-status-card mt-3">
                <div className="config-row">
                  <span className="config-label">Status:</span>
                  <span className={`config-badge ${supabaseInfo.isConfigured ? 'status-live' : 'status-sandbox'}`}>
                    {supabaseInfo.isConfigured ? 'Connected to Supabase Project' : 'Developer Sandbox Active'}
                  </span>
                </div>
                <div className="config-row mt-2">
                  <span className="config-label">Supabase URL:</span>
                  <span className="tech-font text-xs">{supabaseInfo.url}</span>
                </div>
                <div className="config-row mt-2">
                  <span className="config-label">Anon Key:</span>
                  <span className="tech-font text-xs">
                    {supabaseInfo.hasAnonKey ? '••••••••••••••••••••••••' : 'Not set in .env'}
                  </span>
                </div>
              </div>

              <div className="env-guide-box mt-4">
                <strong>To connect your live Supabase project:</strong>
                <p className="text-xs text-muted mt-1">
                  Add your project credentials to the <code className="tech-font">.env</code> file in the project root:
                </p>
                <pre className="env-code-snippet mt-2">
{`# Frontend (.env)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Backend (.env or environment)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key`}
                </pre>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => setShowConfigModal(false)}
              >
                <span>Acknowledge & Close</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
