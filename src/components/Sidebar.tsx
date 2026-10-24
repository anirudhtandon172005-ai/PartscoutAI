import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Cpu,
  Search,
  Scale,
  Building2,
  Bookmark,
  History,
  FileCheck2,
  FileSpreadsheet,
  Settings,
  ShieldAlert,
  Globe2,
  Activity,
  Database,
  Users2,
  KeyRound,
  PackageCheck,
  CheckSquare,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { currentRoute, navigate, savedPartIds, requests, qualityIssues } = useApp();

  const isAdmin = currentRoute.startsWith('/admin');

  const pendingIssuesCount = qualityIssues.filter((q) => !q.resolved).length;
  const activeRequestId = requests[0]?.id || 'req-2026-line4-sensor';

  const navItem = (route: string, label: string, icon: React.ReactNode, badge?: string | number, badgeType?: 'teal' | 'orange') => {
    const isActive = currentRoute === route || (route.includes(':id') && currentRoute.startsWith(route.split(':')[0]));
    return (
      <button
        type="button"
        className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
        onClick={() => {
          navigate(route.replace(':id', activeRequestId));
          if (onClose) onClose();
        }}
      >
        <span className="nav-icon">{icon}</span>
        <span className="nav-label">{label}</span>
        {badge !== undefined && (
          <span className={`nav-badge ${badgeType === 'orange' ? 'badge-orange' : 'badge-teal'}`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose}></div>}
      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-scroll-container">
          {/* Admin vs Engineering Header Switch */}
          <div className="sidebar-context-box">
            <span className="context-label">{isAdmin ? 'ADMIN CONTROL SUITE' : 'ENGINEERING WORKSPACE'}</span>
            <div className="context-plant">Apex PackWorks • Plant B4</div>
          </div>

          {!isAdmin ? (
            /* USER WORKSPACE NAVIGATION */
            <>
              <div className="sidebar-section">
                <span className="section-title">CORE WORKSPACE</span>
                {navItem('/app/dashboard', 'User Dashboard', <LayoutDashboard size={16} />)}
                {navItem('/app/requests/new/machine', 'Start Part Search', <Search size={16} />, 'New', 'orange')}
                {navItem(`/app/results/${activeRequestId}`, 'Search Results', <Cpu size={16} />, 4, 'teal')}
                {navItem('/app/compare/part-ifm-igt205', 'Replacement Comparison', <Scale size={16} />)}
                {navItem('/app/parts/part-ifm-igt205', 'Part Details (3D Twin)', <PackageCheck size={16} />)}
                {navItem('/app/availability/part-ifm-igt205', 'Availability & Stock', <CheckSquare size={16} />)}
              </div>

              <div className="sidebar-section">
                <span className="section-title">PROCUREMENT & TRACKING</span>
                {navItem('/app/tracking', 'Request Tracking', <FileCheck2 size={16} />, 3)}
                {navItem('/app/quotes', 'Quotation Management', <FileSpreadsheet size={16} />, 3)}
                {navItem('/app/saved', 'Saved Parts', <Bookmark size={16} />, savedPartIds.length)}
                {navItem('/app/history', 'Request History', <History size={16} />)}
              </div>

              <div className="sidebar-section">
                <span className="section-title">SUPPLIER DIRECTORY</span>
                {navItem('/app/suppliers', 'Browse Suppliers', <Building2 size={16} />, 6)}
                {navItem('/app/suppliers/supp-mcmaster', 'Supplier Profile', <ExternalLink size={16} />)}
              </div>

              <div className="sidebar-section">
                <span className="section-title">ACCOUNT</span>
                {navItem('/app/settings', 'Profile & Settings', <Settings size={16} />)}
              </div>
            </>
          ) : (
            /* ADMIN SUITE NAVIGATION */
            <>
              <div className="sidebar-section">
                <span className="section-title">SYSTEM ADMINISTRATION</span>
                {navItem('/admin/dashboard', 'Admin Overview', <LayoutDashboard size={16} />)}
                {navItem('/admin/sources', 'Website Source Manager', <Globe2 size={16} />, 8)}
                {navItem('/admin/jobs', 'Collection Monitor', <Activity size={16} />, 'Live')}
              </div>

              <div className="sidebar-section">
                <span className="section-title">DATA MANAGEMENT</span>
                {navItem('/admin/products', 'Product Records', <Database size={16} />)}
                {navItem('/admin/suppliers', 'Supplier Attribution', <Building2 size={16} />)}
                {navItem('/admin/quality', 'Data Quality & Validation', <ShieldAlert size={16} />, pendingIssuesCount, 'orange')}
              </div>

              <div className="sidebar-section">
                <span className="section-title">SECURITY & CONFIG</span>
                {navItem('/admin/users', 'User & Role Access', <Users2 size={16} />)}
                {navItem('/admin/settings', 'API & System Settings', <KeyRound size={16} />)}
              </div>
            </>
          )}

          {/* Quick Switch to Other Side */}
          <div className="sidebar-footer-cta">
            {!isAdmin ? (
              <button
                type="button"
                className="btn btn-outline btn-block btn-xs"
                onClick={() => navigate('/admin/dashboard')}
              >
                <span>Switch to Admin Suite</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-outline btn-block btn-xs"
                onClick={() => navigate('/app/dashboard')}
              >
                <span>Return to Engineer Workspace</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
