import { setBaseUrl } from '@workspace/api-client-react';
  import './lib/axios';
  import './index.css';
  import { createRoot } from 'react-dom/client';
  import App from './App';

  // Wire the Render API URL into the generated fetch client
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
  setBaseUrl(apiBaseUrl);

  // Auth is now handled via HttpOnly cookies — no token getter needed.
  // The browser sends the cookie automatically on every cross-origin request.

  createRoot(document.getElementById('root')!).render(<App />);
  