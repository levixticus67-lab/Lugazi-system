import { setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';
import './lib/axios';
import './index.css';
import { createRoot } from 'react-dom/client';
import App from './App';

// Wire the Render API URL into the generated fetch client
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
setBaseUrl(apiBaseUrl);

// Attach JWT token to every generated API call automatically
setAuthTokenGetter(() => localStorage.getItem('dcl_token'));

createRoot(document.getElementById('root')!).render(<App />);
