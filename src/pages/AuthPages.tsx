import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Lock, Mail, ArrowRight, Building } from 'lucide-react';
import { DemoBadge } from '../components/DemoBadge';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthPageProps {
  mode: 'login' | 'signup';
}

export const AuthPages: React.FC<AuthPageProps> = ({ mode }) => {
  const { navigate, setUserRole, addToast } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [facility, setFacility] = useState('Apex PackWorks - Main Plant');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!isSupabaseConfigured || !supabase) {
      setFormError('Supabase Auth is not configured. Add the VITE_SUPABASE_* values to your local environment.');
      return;
    }

    setIsSubmitting(true);
    let result;
    try {
      result = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name, facility } },
          });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to connect to Supabase Auth.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    if (result.error) {
      setFormError(result.error.message);
      return;
    }

    if (mode === 'signup' && !result.data.session) {
      addToast('Check Your Email', 'Confirm your email address before signing in.', 'info');
      navigate('/login');
      return;
    }

    addToast('Signed In', 'Welcome to your PartScout AI workspace.', 'success');
    navigate('/app/dashboard');
  };

  const handleRoleQuickLogin = (role: 'engineer' | 'procurement' | 'admin') => {
    setUserRole(role);
    addToast(
      'Role Persona Switched',
      `Active persona set to ${role === 'admin' ? 'Administrator' : role === 'procurement' ? 'Procurement Specialist' : 'Lead Maintenance Engineer'}.`,
      'info'
    );
    if (role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/app/dashboard');
    }
  };

  return (
    <div className="auth-page-root">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-brand-mark">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="#D9531E" strokeWidth="2" />
                <circle cx="12" cy="12" r="5" stroke="#117A65" strokeWidth="2" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#D9531E" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="auth-title">{mode === 'login' ? 'Sign In to PartScout AI' : 'Create Engineering Account'}</h2>
            <p className="auth-subtitle">
              {mode === 'login'
                ? 'Enter your plant credentials or choose a quick prototype persona below.'
                : 'Join your plant reliability and procurement engineering workspace.'}
            </p>
          </div>

          {/* Quick Demo Sign-in Personas (Crucial for convenient prototype evaluation!) */}
          <div className="quick-persona-box">
            <span className="persona-box-label">QUICK PROTOTYPE PERSONA ACCESS</span>
            <div className="persona-button-list">
              <button
                type="button"
                className="btn-persona"
                onClick={() => handleRoleQuickLogin('engineer')}
              >
                <div className="persona-btn-text">
                  <strong>Marcus Vance</strong>
                  <span>Lead Maintenance Engineer (Line 4 Focus)</span>
                </div>
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                className="btn-persona"
                onClick={() => handleRoleQuickLogin('procurement')}
              >
                <div className="persona-btn-text">
                  <strong>Elena Gomez</strong>
                  <span>Senior Procurement Specialist (RFQ & Stock)</span>
                </div>
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                className="btn-persona"
                onClick={() => handleRoleQuickLogin('admin')}
              >
                <div className="persona-btn-text">
                  <strong>Sarah Jenkins</strong>
                  <span>System Admin (Crawler & Data Quality)</span>
                </div>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className="auth-divider">
            <span>OR ENTER CUSTOM CREDENTIALS</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label" htmlFor="user-name">Full Name & Title</label>
                <div className="input-with-icon">
                  <User size={16} className="input-icon" />
                  <input
                    id="user-name"
                    type="text"
                    required
                    placeholder="e.g. Alex Mercer (Automation Specialist)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="user-email">Plant Email Address</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" />
                <input
                  id="user-email"
                  type="email"
                  required
                  placeholder="engineer@plant-domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="user-pwd">Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input
                  id="user-pwd"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label" htmlFor="user-facility">Plant Facility / Business Unit</label>
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
            )}

            <button type="submit" className="btn btn-primary btn-block btn-lg">
              <span>{isSubmitting ? 'Connecting…' : mode === 'login' ? 'Sign In to Workspace' : 'Create Account'}</span>
              <ArrowRight size={16} />
            </button>
            {formError && <p className="form-error" role="alert">{formError}</p>}
          </form>

          <div className="auth-footer">
            {mode === 'login' ? (
              <p>
                Don't have a login?{' '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => navigate('/signup')}
                >
                  Create an account
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => navigate('/login')}
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>

        <div className="auth-disclaimer">
          <DemoBadge variant="inline" customText="Prototype Simulation" lastChecked="Local Auth State" />
          <span>Credentials are handled by Supabase Auth. Quick persona access remains available for prototype review.</span>
        </div>
      </div>
    </div>
  );
};
