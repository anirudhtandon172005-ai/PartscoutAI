import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  Compass,
  Cpu,
  ShieldCheck,
  ChevronDown,
  Building,
  Menu,
  X,
  PlusCircle,
  ArrowRight,
  Flame,
  Radio,
  CheckCircle2,
  LogOut,
  Lock,
} from 'lucide-react';
import { DemoBadge } from './DemoBadge';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
  mobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu, mobileMenuOpen }) => {
  const { currentRoute, navigate, userRole, setUserRole, currentUser, requests, signOutFromSupabase, executeQuickSearch } = useApp();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');

  const isPublicPage = currentRoute === '/' || currentRoute === '/login' || currentRoute === '/signup';
  const isAdminPage = currentRoute.startsWith('/admin');

  const activeRequest = requests[0]; // Line 4 proximity sensor request

  const handleNavSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (navSearch.trim().length > 0) {
      const searchId = await executeQuickSearch(navSearch);
      navigate(`/app/results/${searchId}`);
      setNavSearch('');
    }
  };

  return (
    <header className="app-navbar">
      <div className="navbar-inner">
        {/* Left: Mobile hamburger & Brand Logo */}
        <div className="navbar-left">
          {!isPublicPage && (
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={onToggleMobileMenu}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}

          <div
            className="brand-container"
            onClick={() => navigate('/')}
            role="button"
            tabIndex={0}
            title="Go to PartScout AI Home"
          >
            <div className="brand-logo-mark">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="4" strokeWidth="2" stroke="#EA580C" />
                <circle cx="12" cy="12" r="5" strokeWidth="2" stroke="#0D9488" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeWidth="2" stroke="#EA580C" strokeLinecap="round" />
              </svg>
            </div>
            <div className="brand-text">
              <span className="brand-name">PartScout<span className="brand-ai">AI</span></span>
              <span className="brand-sub">Industrial Replacement Intel</span>
            </div>
          </div>

          {isPublicPage && (
            <div className="navbar-badge-slot hide-mobile">
              <span className="nav-prototype-pill">
                <span className="dot pulse"></span>
                <span>PROTOTYPE SANDBOX</span>
              </span>
            </div>
          )}
        </div>

        {/* Center: Quick Omni-Search or Active Investigation Pill */}
        {!isPublicPage ? (
          <div className="navbar-center-slot hide-mobile">
            {activeRequest ? (
              <button
                type="button"
                className="investigation-pill"
                onClick={() => navigate(`/app/results/${activeRequest.id}`)}
                title="Click to view search results for current part"
              >
                <span className="investigation-dot pulse-red"></span>
                <span className="investigation-label">Line-Down Alert:</span>
                <span className="req-part">{activeRequest.originalPartNumber}</span>
                <span className="req-line-badge">Line 4 Capper</span>
                <ArrowRight size={13} className="pill-arrow" />
              </button>
            ) : (
              <form className="nav-quick-search-form" onSubmit={handleNavSearch}>
                <Search size={14} className="search-icon-nav" />
                <input
                  type="text"
                  placeholder="Quick search 500,000+ parts..."
                  value={navSearch}
                  onChange={(e) => setNavSearch(e.target.value)}
                />
              </form>
            )}
          </div>
        ) : (
          <div className="navbar-center-slot hide-tablet">
            <div className="public-nav-status">
              <span className="status-live-dot"></span>
              <span>14,800+ Catalog Feeds Connected • Verified Datasheets</span>
            </div>
          </div>
        )}

        {/* Right: Modern Mode Segmented Switcher, CTA, & Persona Avatar */}
        <div className="navbar-right">
          {/* Polished Segmented Mode Switcher */}
          <div className="nav-segmented-control hide-mobile">
            <button
              type="button"
              className={`segmented-btn ${isPublicPage ? 'active' : ''}`}
              onClick={() => navigate('/')}
            >
              <Compass size={14} />
              <span>Public Tour</span>
            </button>
            <button
              type="button"
              className={`segmented-btn ${!isPublicPage && !isAdminPage ? 'active' : ''}`}
              onClick={() => navigate('/app/dashboard')}
            >
              <Cpu size={14} />
              <span>Engineer Suite</span>
            </button>
            <button
              type="button"
              className={`segmented-btn ${isAdminPage ? 'active' : ''}`}
              onClick={() => navigate('/admin/dashboard')}
            >
              <ShieldCheck size={14} />
              <span>Admin Suite</span>
            </button>
          </div>

          {/* Public Sign In Button */}
          {isPublicPage && currentRoute !== '/login' && currentRoute !== '/signup' && (
            <button
              type="button"
              className="btn btn-outline btn-sm hide-mobile"
              onClick={() => navigate('/login')}
            >
              <Lock size={13} />
              <span>Sign In</span>
            </button>
          )}

          {/* High-Impact Primary CTA Button */}
          {!isAdminPage && (
            <button
              type="button"
              className="btn btn-primary btn-sm nav-cta-btn"
              onClick={() => navigate('/app/requests/new/machine')}
            >
              <PlusCircle size={15} />
              <span>Start Part Search</span>
            </button>
          )}

          {/* User Persona Dropdown */}
          <div className="user-role-dropdown-container">
            <button
              type="button"
              className="role-selector-trigger"
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              aria-label="Switch User Role Persona"
            >
              <div className="role-avatar-wrapper">
                <div className="role-avatar">
                  {(currentUser.name || 'U')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0].toUpperCase())
                    .join('')}
                </div>
                <span className="role-status-dot"></span>
              </div>
              <div className="role-meta hide-tablet">
                <span className="user-name">{currentUser.name}</span>
                <span className="role-name">
                  {userRole === 'admin'
                    ? 'Admin'
                    : userRole === 'procurement'
                    ? 'Procurement'
                    : 'Maintenance Lead'}
                </span>
              </div>
              <ChevronDown size={14} className="dropdown-caret" />
            </button>

            {roleDropdownOpen && (
              <div
                className="role-menu-popover"
                onMouseLeave={() => setRoleDropdownOpen(false)}
              >
                <div className="role-menu-header">
                  <div className="user-profile-header-strip mb-2">
                    <strong style={{ display: 'block', color: '#FFFFFF', fontSize: '0.88rem' }}>{currentUser.name}</strong>
                    <small style={{ color: '#94A3B8', fontSize: '0.72rem' }}>{currentUser.email}</small>
                  </div>
                  <span className="menu-header-label">Switch Role Sandbox</span>
                </div>

                <button
                  type="button"
                  className={`role-option-item ${userRole === 'engineer' ? 'selected' : ''}`}
                  onClick={() => {
                    setUserRole('engineer');
                    setRoleDropdownOpen(false);
                    navigate('/app/dashboard');
                  }}
                >
                  <div className="role-option-info">
                    <div className="option-title-row">
                      <strong>{userRole === 'engineer' && currentUser.name ? currentUser.name : 'Marcus Vance'}</strong>
                      {userRole === 'engineer' && (
                        <span className="active-pill">Active</span>
                      )}
                    </div>
                    <span className="option-sub">Lead Maintenance Engineer</span>
                    <small>Focus: Specifications, Fit & Tolerances, Line Down response</small>
                  </div>
                </button>

                <button
                  type="button"
                  className={`role-option-item ${userRole === 'procurement' ? 'selected' : ''}`}
                  onClick={() => {
                    setUserRole('procurement');
                    setRoleDropdownOpen(false);
                    navigate('/app/quotes');
                  }}
                >
                  <div className="role-option-info">
                    <div className="option-title-row">
                      <strong>Elena Gomez</strong>
                      {userRole === 'procurement' && (
                        <span className="active-pill">Active</span>
                      )}
                    </div>
                    <span className="option-sub">Senior Technical Procurement Lead</span>
                    <small>Focus: Supplier directory, RFQs, Pricing, Lead-time tradeoffs</small>
                  </div>
                </button>

                <button
                  type="button"
                  className={`role-option-item ${userRole === 'admin' ? 'selected' : ''}`}
                  onClick={() => {
                    setUserRole('admin');
                    setRoleDropdownOpen(false);
                    navigate('/admin/dashboard');
                  }}
                >
                  <div className="role-option-info">
                    <div className="option-title-row">
                      <strong>Sarah Jenkins</strong>
                      {userRole === 'admin' && (
                        <span className="active-pill">Active</span>
                      )}
                    </div>
                    <span className="option-sub">Enterprise System Administrator</span>
                    <small>Focus: Source domains, crawler jobs, data quality, API settings</small>
                  </div>
                </button>

                <div className="role-menu-footer">
                  <div className="plant-tag">
                    <Building size={12} />
                    <span>Apex PackWorks • Plant B4</span>
                  </div>
                  <button
                    type="button"
                    className="btn-signout mt-2"
                    onClick={() => {
                      setRoleDropdownOpen(false);
                      signOutFromSupabase();
                    }}
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
