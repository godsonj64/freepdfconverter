import {StrictMode, Suspense, lazy} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const PdfReader = lazy(() => import('./reader/PdfReader'));

const isReaderRoute = window.location.pathname.replace(/\/+$/, '') === '/reader';

const ReaderFallback = () => (
  <div
    role="status"
    className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--paper)] text-[var(--ink)]"
  >
    <div className="w-8 h-8 rounded-full border-2 border-[var(--line)] border-t-[var(--charcoal)] animate-spin" />
    <span className="text-sm font-bold">Loading reader…</span>
  </div>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isReaderRoute ? (
      <Suspense fallback={<ReaderFallback />}>
        <PdfReader />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
