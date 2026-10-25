import React, { useState } from 'react';
import { useApp, AppProvider } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { EvidenceDrawer } from './components/EvidenceDrawer';

// Pages
import { LandingPage } from './pages/LandingPage';
import { AuthPages } from './pages/AuthPages';
import { UserDashboard } from './pages/UserDashboard';
import { RequestWizard } from './pages/RequestWizard';
import { PartSearchProgress } from './pages/PartSearchProgress';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { PartDetailPage } from './pages/PartDetailPage';
import { ReplacementComparisonPage } from './pages/ReplacementComparisonPage';
import { SupplierDirectoryPage } from './pages/SupplierDirectoryPage';
import { SupplierDetailPage } from './pages/SupplierDetailPage';
import { AvailabilityStockPage } from './pages/AvailabilityStockPage';
import { SavedPartsPage } from './pages/SavedPartsPage';
import { RequestHistoryPage } from './pages/RequestHistoryPage';
import { PartTrackingPage } from './pages/PartTrackingPage';
import { QuotationManagementPage } from './pages/QuotationManagementPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';
import { AdminPages } from './pages/AdminPages';

const AppRouter: React.FC = () => {
  const { currentRoute, authReady, isAuthenticated, navigate } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isPublic = currentRoute === '/' || currentRoute === '/login' || currentRoute === '/signup';

  React.useEffect(() => {
    if (authReady && !isAuthenticated && !isPublic && import.meta.env.VITE_DEMO_MODE !== 'true') {
      navigate('/login');
    }
  }, [authReady, isAuthenticated, isPublic, navigate]);

  if (!authReady) return <div className="app-loading">Loading secure workspace…</div>;

  // Parse route parameters
  const renderRouteContent = () => {
    if (currentRoute === '/') {
      return <LandingPage />;
    }
    if (currentRoute === '/login') {
      return <AuthPages mode="login" />;
    }
    if (currentRoute === '/signup') {
      return <AuthPages mode="signup" />;
    }

    // User Workspace
    if (currentRoute === '/app/dashboard' || currentRoute === '/app') {
      return <UserDashboard />;
    }
    if (currentRoute === '/app/requests/new/machine' || currentRoute === '/app/requests/new') {
      return <RequestWizard step="machine" />;
    }
    if (currentRoute === '/app/requests/new/part') {
      return <RequestWizard step="part" />;
    }
    if (currentRoute === '/app/requests/new/review') {
      return <RequestWizard step="review" />;
    }
    if (currentRoute.startsWith('/app/search/') && currentRoute.includes('/parts/')) {
      const parts = currentRoute.split('/');
      const searchId = parts[3];
      const candidateId = parts[5];
      return <PartDetailPage searchId={searchId} candidateId={candidateId} />;
    }
    if (currentRoute.startsWith('/app/search/') && currentRoute.includes('/compare/')) {
      const parts = currentRoute.split('/');
      const searchId = parts[3];
      const candidateId = parts[5];
      return <ReplacementComparisonPage searchId={searchId} candidateId={candidateId} />;
    }
    if (currentRoute.startsWith('/app/search/')) {
      const id = currentRoute.replace('/app/search/', '');
      return <PartSearchProgress searchId={id} />;
    }
    if (currentRoute.startsWith('/app/results/')) {
      const id = currentRoute.replace('/app/results/', '');
      return <SearchResultsPage searchId={id} />;
    }
    // Legacy routes removed - all part detail and comparison now require searchId
    // if (currentRoute.startsWith('/app/parts/')) { ... }
    // if (currentRoute.startsWith('/app/compare/')) { ... }
    if (currentRoute === '/app/suppliers') {
      return <SupplierDirectoryPage />;
    }
    if (currentRoute.startsWith('/app/suppliers/')) {
      const id = currentRoute.replace('/app/suppliers/', '');
      return <SupplierDetailPage supplierId={id} />;
    }
    if (currentRoute.startsWith('/app/availability/')) {
      const id = currentRoute.replace('/app/availability/', '');
      return <AvailabilityStockPage partId={id} />;
    }
    if (currentRoute === '/app/saved') {
      return <SavedPartsPage />;
    }
    if (currentRoute === '/app/history') {
      return <RequestHistoryPage />;
    }
    if (currentRoute === '/app/tracking') {
      return <PartTrackingPage />;
    }
    if (currentRoute === '/app/quotes') {
      return <QuotationManagementPage />;
    }
    if (currentRoute === '/app/settings') {
      return <ProfileSettingsPage />;
    }

    // Admin Suite
    if (currentRoute === '/admin/dashboard' || currentRoute === '/admin') {
      return <AdminPages subpage="dashboard" />;
    }
    if (currentRoute === '/admin/sources') {
      return <AdminPages subpage="sources" />;
    }
    if (currentRoute === '/admin/jobs') {
      return <AdminPages subpage="jobs" />;
    }
    if (currentRoute === '/admin/products') {
      return <AdminPages subpage="products" />;
    }
    if (currentRoute === '/admin/suppliers') {
      return <AdminPages subpage="suppliers" />;
    }
    if (currentRoute === '/admin/quality') {
      return <AdminPages subpage="quality" />;
    }
    if (currentRoute === '/admin/users') {
      return <AdminPages subpage="users" />;
    }
    if (currentRoute === '/admin/settings') {
      return <AdminPages subpage="settings" />;
    }

    // Default fallback to Dashboard
    return <UserDashboard />;
  };

  return (
    <div className={`app-shell ${isPublic ? 'public-layout' : 'workspace-layout'}`}>
      <Navbar
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        mobileMenuOpen={mobileMenuOpen}
      />

      <div className="app-shell-body">
        {!isPublic && (
          <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        )}

        <main className="app-main-content">
          <div className="content-container">
            {renderRouteContent()}
          </div>
        </main>
      </div>

      <EvidenceDrawer />
      <ToastContainer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
};

export default App;
