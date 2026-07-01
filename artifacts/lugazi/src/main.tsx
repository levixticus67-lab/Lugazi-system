import { setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { proactiveRefresh } from './lib/axios';
import { scheduleAllNotifications } from './services/notificationScheduler';
import './index.css';
import { createRoot } from 'react-dom/client';
import App from './App';

// Wire the Render API URL into the generated fetch client
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
setBaseUrl(apiBaseUrl);

if (Capacitor.isNativePlatform()) {
  // Supply the stored JWT to all Orval-generated React Query hooks.
  setAuthTokenGetter(() => localStorage.getItem('dcl_token_jwt'));

  // Refresh the token proactively if it is near expiry, and reschedule
  // local notifications every time the app starts or comes to the foreground.
  proactiveRefresh();
  scheduleAllNotifications();

  CapApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      proactiveRefresh();
      scheduleAllNotifications();
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
