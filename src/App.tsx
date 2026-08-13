import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomePage } from './features/storefront/HomePage';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { useEffect, useRef } from 'react';

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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RouteTracker />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
