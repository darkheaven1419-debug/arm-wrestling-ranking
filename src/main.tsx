import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initGA, pageview } from '@/lib/analytics';
import { initErrorLogger } from '@/lib/errorLogger';
import App from './App';

initErrorLogger();
import './index.css';

initGA();

function RouteTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    pageview(pathname || '/');
  }, [pathname]);
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <RouteTracker />
          <App />
          <Toaster position="top-center" toastOptions={{ duration: 3000,
            style: { background: '#1c1917', color: '#e7e5e4', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', fontSize: '14px' },
          }} />
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
