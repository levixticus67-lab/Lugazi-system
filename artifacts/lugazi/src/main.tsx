import { setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { proactiveRefresh } from './lib/axios';
import './index.css';
import { createRoot } from 'react-dom/client';
import App from './App';

// Wire the Render API URL into the generated fetch client
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
setBaseUrl(apiBaseUrl);

if (Capacitor.isNativePlatform()) {
  // Supply the stored JWT to all Orval-generated React Query hooks.
  // The getter always reads the latest value from localStorage so it picks up
  // any token that was silently refreshed by the axios interceptor.
  setAuthTokenGetter(() => localStorage.getItem('dcl_token_jwt'));

  // Proactively refresh the token on app start (in case it has nearly expired
  // while the app was closed) and every time the user brings the app back to
  // the foreground. This prevents the 401 → redirect-to-login surprise.
  proactiveRefresh();
  CapApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) proactiveRefresh();
  });
}

createRoot(document.getElementById('root')!).render(<App />);
