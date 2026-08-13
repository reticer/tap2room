import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect, useRef, Suspense } from 'react';

// Use React.lazy for Code Splitting
const HomePage = React.lazy(() => import('./features/storefront/HomePage').then(module => ({ default: module.HomePage })));
const AdminDashboard = React.lazy(() => import('./features/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })));

const queryClient = new QueryClient();

function RouteTracker() {
  const location = useLocation();
  const navigate = useNavigate();
  const isFirstLoad = useRef(true);

  useEffect(() => {
    // 1. On initial load, if we land on root (/), check if there is a saved lastRoute
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      const lastRoute = localStorage.getItem('tap2room_last_route');
      
      if (lastRoute && lastRoute !== '/' && location.pathname === '/') {
        // Auto-redirect to the last visited page (e.g. /admin)
        navigate(lastRoute, { replace: true });
        return;
      }
    }

    // 2. Track subsequent route changes
    localStorage.setItem('tap2room_last_route', location.pathname);
  }, [location, navigate]);

  return null;
}

// Simple loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RouteTracker />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
