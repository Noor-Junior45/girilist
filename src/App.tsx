import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { LoginView } from './views/LoginView';
import { ProductListView } from './views/ProductListView';
import { ProductFormView } from './views/ProductFormView';
import { OffersListView } from './views/OffersListView';
import { OfferFormView } from './views/OfferFormView';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, isAdmin, isLoading } = useAuth();
  
  // Custom router state from URL pathname / hash
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) return hash;
    return window.location.pathname || '/';
  });

  // Sync route on popstate (browser Back / Forward buttons)
  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      const path = hash || window.location.pathname || '/';
      setCurrentPath(path);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigate = (path: string) => {
    window.history.pushState(null, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Route matching helper
  const isLoginPage = currentPath === '/login';
  const isAddProductPage = currentPath === '/products/new';
  const editProductMatch = currentPath.match(/^\/products\/([^/]+)\/edit$/);
  const editingProductId = editProductMatch ? editProductMatch[1] : null;

  const isOffersListPage = currentPath === '/offers';
  const isAddOfferPage = currentPath === '/offers/new';
  const editOfferMatch = currentPath.match(/^\/offers\/([^/]+)\/edit$/);
  const editingOfferId = editOfferMatch ? editOfferMatch[1] : null;

  // Global Auth Guard: Redirect unauthenticated or non-admin users to /login
  useEffect(() => {
    if (!isLoading) {
      if ((!user || !isAdmin) && !isLoginPage) {
        navigate('/login');
      } else if (user && isAdmin && isLoginPage) {
        navigate('/');
      }
    }
  }, [user, isAdmin, isLoading, isLoginPage]);

  // Loading Screen while authenticating
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f2efeb] flex flex-col items-center justify-center gap-3 text-[#1a1716] font-mono">
        <Loader2 className="w-8 h-8 text-[#2e4a3d] animate-spin" />
        <div className="text-xs font-semibold tracking-widest uppercase">
          Verifying Admin Session...
        </div>
        <div className="text-[10px] text-[#1a1716]/60">public.admin_users (RLS) &bull; iffdkhzctkbglmvaayeh</div>
      </div>
    );
  }

  // If not logged in or on /login route, show Login screen
  if (!user || !isAdmin || isLoginPage) {
    return (
      <LoginView
        onSuccess={() => {
          navigate('/');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f2efeb] text-[#1a1716] flex flex-col font-sans antialiased">
      {/* Admin Top Navigation Bar */}
      <Navbar
        currentPath={currentPath}
        onNavigate={navigate}
      />

      {/* Main App Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAddOfferPage ? (
          <OfferFormView
            onCancel={() => navigate('/offers')}
            onSuccess={() => navigate('/offers')}
          />
        ) : editingOfferId ? (
          <OfferFormView
            offerId={editingOfferId}
            onCancel={() => navigate('/offers')}
            onSuccess={() => navigate('/offers')}
          />
        ) : isOffersListPage ? (
          <OffersListView
            onCreateOffer={() => navigate('/offers/new')}
            onEditOffer={(id) => navigate(`/offers/${id}/edit`)}
          />
        ) : isAddProductPage ? (
          <ProductFormView
            onCancel={() => navigate('/')}
            onSuccess={() => navigate('/')}
          />
        ) : editingProductId ? (
          <ProductFormView
            productId={editingProductId}
            onCancel={() => navigate('/')}
            onSuccess={() => navigate('/')}
          />
        ) : (
          <ProductListView
            onAddProduct={() => navigate('/products/new')}
            onEditProduct={(id) => navigate(`/products/${id}/edit`)}
            onNavigateToOffers={() => navigate('/offers')}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
