import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  SlidersHorizontal,
  Shield,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  User,
  Building,
  Menu,
  X,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';
import { DemoBadge } from './DemoBadge';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
  mobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu, mobileMenuOpen }) => {
  const { currentRoute, navigate, userRole, setUserRole, currentUser, requests } = useApp();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const isPublicPage = currentRoute === '/' || currentRoute === '/login' || currentRoute === '/signup';
  const isAdminPage = currentRoute.startsWith('/admin');

  const activeRequest = requests[0]; // Line 4 proximity sensor request

  return (
    <header className="app-navbar">
      <div className="navbar-inner">
        {/* Left: Mobile hamburger & Brand */}
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
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="2" stroke="#D9531E" />
                <circle cx="12" cy="12" r="5" strokeWidth="2" stroke="#117A65" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeWidth="2" stroke="#D9531E" strokeLinecap="round" />
              </svg>
            </div>
            <div className="brand-text">
              <span className="brand-name">PartScout<span className="brand-ai">AI</span></span>
              <span className="brand-sub">Industrial Replacement Intel</span>
            </div>
          </div>

          {isPublicPage && (
            <div className="navbar-badge-slot">
              <DemoBadge variant="inline" customText="Prototype Mode" lastChecked="Live Mock" />
            </div>
          )}
        </div>

        {/* Center: Context Breadcrumb or Active Investigation Quick Access */}
        {!isPublicPage && activeRequest && (
          <div className="navbar-center-investigation hide-mobile">
            <span className="investigation-label">Active Investigation:</span>
            <button
              type="button"
              className="investigation-pill"
              onClick={() => navigate(`/app/results/${activeRequest.id}`)}
              title="Click to view search results for current part"
            >
              <span className="req-num tech-font">{activeRequest.requestNumber}</span>
              <span className="req-part">{activeRequest.originalPartNumber}</span>
              <span className="req-status-tag">{activeRequest.status}</span>
              <ArrowRight size={13} className="pill-arrow" />
            </button>
          </div>
        )}

        {/* Right: Actions, Role Selector & Navigation Mode */}
        <div className="navbar-right">
          {/* Quick links between Public / App / Admin */}
          <div className="nav-mode-switch hide-mobile">
            <button
              type="button"
              className={`mode-btn ${isPublicPage ? 'active' : ''}`}
              onClick={() => navigate('/')}
            >
              Public Tour
            </button>
            <button
              type="button"
              className={`mode-btn ${!isPublicPage && !isAdminPage ? 'active' : ''}`}
              onClick={() => navigate('/app/dashboard')}
            >
              Engineer Workspace
            </button>
            <button
              type="button"
              className={`mode-btn ${isAdminPage ? 'active' : ''}`}
              onClick={() => navigate('/admin/dashboard')}
            >
              Admin Suite
            </button>
          </div>

          {/* Primary Action Button */}
          {!isAdminPage && (
            <button
              type="button"
              className="btn btn-primary btn-sm new-search-btn"
              onClick={() => navigate('/app/requests/new/machine')}
            >
              <PlusCircle size={15} />
              <span>Start Part Search</span>
            </button>
          )}

          {/* User Role Switcher Dropdown */}
          <div className="user-role-dropdown-container">
            <button
              type="button"
              className="role-selector-trigger"
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              aria-label="Switch User Role Persona"
            >
              <div className="role-avatar">
                {userRole === 'admin' ? 'SJ' : userRole === 'procurement' ? 'EG' : 'MV'}
              </div>
              <div className="role-meta hide-tablet">
                <span className="user-name">{currentUser.name}</span>
                <span className="role-name">{userRole === 'admin' ? 'Admin' : userRole === 'procurement' ? 'Procurement' : 'Maintenance Lead'}</span>
              </div>
              <ChevronDown size={14} className="dropdown-caret" />
            </button>

            {roleDropdownOpen && (
              <div className="role-menu-popover" onMouseLeave={() => setRoleDropdownOpen(false)}>
                <div className="role-menu-header">
                  <span className="menu-header-label">Switch Persona (Prototype Sandbox)</span>
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
                    <strong>Marcus Vance</strong>
                    <span>Lead Maintenance Engineer</span>
                    <small>Focus: Specifications, Fit & Tolerances, Line Down response</small>
                  </div>
                  {userRole === 'engineer' && <span className="active-dot"></span>}
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
                    <strong>Elena Gomez</strong>
                    <span>Senior Technical Procurement Lead</span>
                    <small>Focus: Supplier directory, RFQs, Pricing, Lead-time tradeoffs</small>
                  </div>
                  {userRole === 'procurement' && <span className="active-dot"></span>}
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
                    <strong>Sarah Jenkins</strong>
                    <span>Enterprise System Administrator</span>
                    <small>Focus: Source domains, crawler jobs, data quality, API settings</small>
                  </div>
                  {userRole === 'admin' && <span className="active-dot"></span>}
                </button>

                <div className="role-menu-footer">
                  <div className="plant-tag">
                    <Building size={12} />
                    <span>Apex PackWorks • Plant B4</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
