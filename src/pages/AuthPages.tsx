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
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleGoogleSignIn = async () => {
    setFormError('');

    if (!isSupabaseConfigured || !supabase) {
      setFormError('Supabase Auth is not configured. Add VITE_SUPABASE_* to your environment.');
      return;
    }

    setIsGoogleSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        setFormError(error.message);
        setIsGoogleSubmitting(false);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to connect to Google Auth.');
      setIsGoogleSubmitting(false);
    }
  };

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

          {/* Primary SSO Login (Google OAuth via Supabase) */}
          <div className="social-auth-box">
            <button
              id="google-signin-btn"
              type="button"
              className="btn-google-sso"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSubmitting || isSubmitting}
            >
              {isGoogleSubmitting ? (
                <>
                  <span className="spinner-sm" />
                  <span>Redirecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}</span>
                </>
              )}
            </button>
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

          <div className="auth-divider">
            <span>OR TEST WITH PROTOTYPE PERSONA</span>
          </div>

          <div className="quick-persona-box">
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
