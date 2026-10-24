import React, { useState } from 'react';
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
  ChevronDown,
  ChevronRight,
  Layers,
  Wrench,
  ShieldCheck,
  Flame,
  Radio,
  FileText
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { currentRoute, navigate, savedPartIds, requests, qualityIssues, guardrails } = useApp();

  const isAdmin = currentRoute.startsWith('/admin');
  const activeRequestId = requests[0]?.id || 'req-line4-sensor';
  const pendingIssuesCount = qualityIssues.filter((q) => !q.resolved).length;

  // Collapsible dropdown menu states for the side navigation
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    discovery: true,
    specs: true,
    procurement: true,
    plant: false,
    adminSystem: true,
    adminData: true,
    adminSecurity: false,
  });

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const navItem = (
    route: string,
    label: string,
    icon: React.ReactNode,
    badge?: string | number,
    badgeType?: 'teal' | 'orange' | 'amber'
  ) => {
    const isActive =
      currentRoute === route ||
      (route.includes(':id') && currentRoute.startsWith(route.split(':')[0]));

    return (
      <button
        type="button"
        className={`sidebar-dropdown-item ${isActive ? 'active' : ''}`}
        onClick={() => {
          navigate(route.replace(':id', activeRequestId));
          if (onClose) onClose();
        }}
      >
        <span className="item-icon">{icon}</span>
        <span className="item-label">{label}</span>
        {badge !== undefined && (
          <span
            className={`item-badge ${
              badgeType === 'orange'
                ? 'badge-orange'
                : badgeType === 'amber'
                ? 'badge-amber'
                : 'badge-teal'
            }`}
          >
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
          {/* Main Prominent Heading Header */}
          <div className="sidebar-main-heading-block">
            <div className="main-heading-badge">
              <span className="heading-dot pulse"></span>
              <span>{isAdmin ? 'ADMIN CONSOLE' : 'ENGINEERING SUITE'}</span>
            </div>
            <h2 className="main-heading-title">
              {isAdmin ? 'System Operations' : 'Technical Procurement'}
            </h2>
            <div className="plant-status-chip">
              <span className="plant-dot"></span>
              <span>Apex PackWorks • Plant B4</span>
            </div>
          </div>

          {!isAdmin ? (
            /* ============================================================
               ENGINEERING SUITE - ONE MAIN HEADING & DROPDOWN MENUS
               ============================================================ */
            <div className="sidebar-accordion-group">
              {/* Core Dashboard Direct Action */}
              <div className="sidebar-quick-dash">
                {navItem(
                  '/app/dashboard',
                  'Executive Overview',
                  <LayoutDashboard size={16} />
                )}
              </div>

              {/* Dropdown Menu 1: Discovery & Crawler */}
              <div className="sidebar-dropdown-section">
                <button
                  type="button"
                  className="dropdown-trigger-header"
                  onClick={() => toggleSection('discovery')}
                >
                  <div className="trigger-left">
                    <Search size={15} className="trigger-icon text-orange" />
                    <span className="trigger-title">Part Discovery</span>
                  </div>
                  <div className="trigger-right">
                    <span className="trigger-count">4</span>
                    {openSections.discovery ? (
                      <ChevronDown size={14} className="chevron-icon rotate" />
                    ) : (
                      <ChevronRight size={14} className="chevron-icon" />
                    )}
                  </div>
                </button>

                {openSections.discovery && (
                  <div className="dropdown-items-panel">
                    {navItem(
                      '/app/requests/new/machine',
                      'Start Part Search',
                      <Search size={14} />,
                      'New',
                      'orange'
                    )}
                    {navItem(
                      `/app/results/${activeRequestId}`,
                      'Candidate Results',
                      <Cpu size={14} />,
                      4,
                      'teal'
                    )}
                    {navItem(
                      `/app/search/${activeRequestId}`,
                      'Crawler Visualizer',
                      <Activity size={14} />
                    )}
                    {navItem(
                      '/app/parts/part-ifm-igt205',
                      'Part 3D Digital Twin',
                      <PackageCheck size={14} />
                    )}
                  </div>
                )}
              </div>

              {/* Dropdown Menu 2: Technical Specification Matrix */}
              <div className="sidebar-dropdown-section">
                <button
                  type="button"
                  className="dropdown-trigger-header"
                  onClick={() => toggleSection('specs')}
                >
                  <div className="trigger-left">
                    <Scale size={15} className="trigger-icon text-teal" />
                    <span className="trigger-title">Specification Matrix</span>
                  </div>
                  <div className="trigger-right">
                    {openSections.specs ? (
                      <ChevronDown size={14} className="chevron-icon rotate" />
                    ) : (
                      <ChevronRight size={14} className="chevron-icon" />
                    )}
                  </div>
                </button>

                {openSections.specs && (
                  <div className="dropdown-items-panel">
                    {navItem(
                      '/app/compare/part-ifm-igt205',
                      'Side-by-Side Tolerance Audit',
                      <Scale size={14} />
                    )}
                    {navItem(
                      '/app/parts/part-ifm-igt205',
                      'Interactive CAD Inspector',
                      <Wrench size={14} />
                    )}
                    {navItem(
                      '/app/learning-loop',
                      'Self-Improving Engine',
                      <ShieldCheck size={14} />,
                      guardrails.filter((g) => g.active).length,
                      'teal'
                    )}
                  </div>
                )}
              </div>

              {/* Dropdown Menu 3: Inventory & Procurement RFQs */}
              <div className="sidebar-dropdown-section">
                <button
                  type="button"
                  className="dropdown-trigger-header"
                  onClick={() => toggleSection('procurement')}
                >
                  <div className="trigger-left">
                    <CheckSquare size={15} className="trigger-icon text-amber" />
                    <span className="trigger-title">Procurement & RFQs</span>
                  </div>
                  <div className="trigger-right">
                    <span className="trigger-count">3</span>
                    {openSections.procurement ? (
                      <ChevronDown size={14} className="chevron-icon rotate" />
                    ) : (
                      <ChevronRight size={14} className="chevron-icon" />
                    )}
                  </div>
                </button>

                {openSections.procurement && (
                  <div className="dropdown-items-panel">
                    {navItem(
                      '/app/availability/part-ifm-igt205',
                      'Distributor Stock & Feeds',
                      <CheckSquare size={14} />
                    )}
                    {navItem(
                      '/app/quotes',
                      'Quotation Comparison',
                      <FileSpreadsheet size={14} />,
                      3,
                      'teal'
                    )}
                    {navItem(
                      '/app/saved',
                      'Pinned Spares Shelf',
                      <Bookmark size={14} />,
                      savedPartIds.length
                    )}
                    {navItem(
                      '/app/history',
                      'Past Search Archive',
                      <History size={14} />
                    )}
                  </div>
                )}
              </div>

              {/* Dropdown Menu 4: Plant Lines & Suppliers */}
              <div className="sidebar-dropdown-section">
                <button
                  type="button"
                  className="dropdown-trigger-header"
                  onClick={() => toggleSection('plant')}
                >
                  <div className="trigger-left">
                    <Building2 size={15} className="trigger-icon text-muted" />
                    <span className="trigger-title">Plant & Network</span>
                  </div>
                  <div className="trigger-right">
                    {openSections.plant ? (
                      <ChevronDown size={14} className="chevron-icon rotate" />
                    ) : (
                      <ChevronRight size={14} className="chevron-icon" />
                    )}
                  </div>
                </button>

                {openSections.plant && (
                  <div className="dropdown-items-panel">
                    {navItem(
                      '/app/tracking',
                      'Live Request Progression',
                      <FileCheck2 size={14} />
                    )}
                    {navItem(
                      '/app/suppliers',
                      'Authorized Distributors',
                      <Building2 size={14} />,
                      6
                    )}
                    {navItem(
                      '/app/settings',
                      'Metric / Imperial Units',
                      <Settings size={14} />
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ============================================================
               ADMIN SUITE - ONE MAIN HEADING & DROPDOWN MENUS
               ============================================================ */
            <div className="sidebar-accordion-group">
              <div className="sidebar-quick-dash">
                {navItem(
                  '/admin/dashboard',
                  'Admin System Monitor',
                  <LayoutDashboard size={16} />
                )}
              </div>

              {/* Admin Dropdown 1: Sources & Crawler Queues */}
              <div className="sidebar-dropdown-section">
                <button
                  type="button"
                  className="dropdown-trigger-header"
                  onClick={() => toggleSection('adminSystem')}
                >
                  <div className="trigger-left">
                    <Globe2 size={15} className="trigger-icon text-teal" />
                    <span className="trigger-title">Crawler & Ingestion</span>
                  </div>
                  <div className="trigger-right">
                    {openSections.adminSystem ? (
                      <ChevronDown size={14} className="chevron-icon rotate" />
                    ) : (
                      <ChevronRight size={14} className="chevron-icon" />
                    )}
                  </div>
                </button>

                {openSections.adminSystem && (
                  <div className="dropdown-items-panel">
                    {navItem(
                      '/admin/sources',
                      'Domain Sources',
                      <Globe2 size={14} />,
                      8
                    )}
                    {navItem(
                      '/admin/jobs',
                      'Extraction Jobs',
                      <Activity size={14} />,
                      'Active',
                      'teal'
                    )}
                  </div>
                )}
              </div>

              {/* Admin Dropdown 2: Data Quality & Products */}
              <div className="sidebar-dropdown-section">
                <button
                  type="button"
                  className="dropdown-trigger-header"
                  onClick={() => toggleSection('adminData')}
                >
                  <div className="trigger-left">
                    <Database size={15} className="trigger-icon text-orange" />
                    <span className="trigger-title">Master Data & QA</span>
                  </div>
                  <div className="trigger-right">
                    {pendingIssuesCount > 0 && (
                      <span className="trigger-count alert">
                        {pendingIssuesCount}
                      </span>
                    )}
                    {openSections.adminData ? (
                      <ChevronDown size={14} className="chevron-icon rotate" />
                    ) : (
                      <ChevronRight size={14} className="chevron-icon" />
                    )}
                  </div>
                </button>

                {openSections.adminData && (
                  <div className="dropdown-items-panel">
                    {navItem(
                      '/admin/products',
                      'Product Master Records',
                      <Database size={14} />
                    )}
                    {navItem(
                      '/admin/suppliers',
                      'Supplier Verification',
                      <Building2 size={14} />
                    )}
                    {navItem(
                      '/admin/quality',
                      'Specification Conflicts',
                      <ShieldAlert size={14} />,
                      pendingIssuesCount,
                      'orange'
                    )}
                    {navItem(
                      '/admin/learning-loop',
                      'Self-Improving Engine',
                      <ShieldCheck size={14} />,
                      guardrails.filter((g) => g.active).length,
                      'teal'
                    )}
                  </div>
                )}
              </div>

              {/* Admin Dropdown 3: Permissions & Settings */}
              <div className="sidebar-dropdown-section">
                <button
                  type="button"
                  className="dropdown-trigger-header"
                  onClick={() => toggleSection('adminSecurity')}
                >
                  <div className="trigger-left">
                    <KeyRound size={15} className="trigger-icon text-muted" />
                    <span className="trigger-title">Access & System API</span>
                  </div>
                  <div className="trigger-right">
                    {openSections.adminSecurity ? (
                      <ChevronDown size={14} className="chevron-icon rotate" />
                    ) : (
                      <ChevronRight size={14} className="chevron-icon" />
                    )}
                  </div>
                </button>

                {openSections.adminSecurity && (
                  <div className="dropdown-items-panel">
                    {navItem(
                      '/admin/users',
                      'Plant User Roles',
                      <Users2 size={14} />
                    )}
                    {navItem(
                      '/admin/settings',
                      'API Tokens & Service Limits',
                      <KeyRound size={14} />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Switch Button at the bottom */}
          <div className="sidebar-footer-cta">
            {!isAdmin ? (
              <button
                type="button"
                className="btn btn-outline btn-block btn-sm"
                onClick={() => navigate('/admin/dashboard')}
              >
                <ShieldCheck size={14} />
                <span>Switch to Admin Suite</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-outline btn-block btn-sm"
                onClick={() => navigate('/app/dashboard')}
              >
                <Wrench size={14} />
                <span>Return to Engineer Suite</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
