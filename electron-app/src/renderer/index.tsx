import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './ErrorBoundary';
import { installBrowserShimsIfNeeded } from './runtime';
import './attribution.css';

// Must run BEFORE App mounts — Scheduler.start() touches window.log.info
// on its first line, so the shims have to be in place by then.
installBrowserShimsIfNeeded();

const root = document.getElementById('root');
if (!root) throw new Error('No #root element');
createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
