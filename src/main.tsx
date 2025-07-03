import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import Playground from './features/playground/Playground.tsx';

if (import.meta.env.DEV) {
  const { worker } = await import('./mocks/browser');
  try {
    await worker.start({
      onUnhandledRequest: 'bypass',
      quiet: true,
    });
  } catch (e) {
    console.warn('[MSW] failed to start:', e);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Playground />
  </StrictMode>
);
