import { setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';
import { Capacitor } from '@capacitor/core';
import './lib/axios';
import './index.css';
import { createRoot } from 'react-dom/client';
import App from './App';

// Wire the Render API URL into the generated fetch client
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
setBaseUrl(apiBaseUrl);

// On native (Capacitor), HttpOnly cookies set by the remote API server do not
// persist reliably across app restarts in the Android WebView's cross-origin
// context.  Axios handles this via its own interceptor (see lib/axios.ts), but
// the Orval-generated React Query hooks use customFetch — which is separate
// and needs its own token getter.  Without this, all hook-based API calls
// (useGetDashboardStats, etc.) go out without credentials and receive a 401,
// causing "Could not load data" errors after the app is restarted.
if (Capacitor.isNativePlatform()) {
  setAuthTokenGetter(() => localStorage.getItem('dcl_token_jwt'));
}

createRoot(document.getElementById('root')!).render(<App />);
