import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter, MemoryRouter } from 'react-router-dom';
import { App } from './App';
import './styles.css';

// Embedded HTML previews may have an opaque about:srcdoc origin and no usable URL.
const standaloneRouter = ['http:', 'https:', 'file:'].includes(window.location.protocol)
  ? HashRouter
  : MemoryRouter;
const Router = import.meta.env.MODE === 'standalone' ? standaloneRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
);
