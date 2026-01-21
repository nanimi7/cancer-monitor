import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA Service Worker 등록
serviceWorkerRegistration.register({
  onSuccess: () => console.log('Service Worker registered successfully'),
  onUpdate: (registration) => {
    console.log('New version available! Please refresh.');
    if (window.confirm('새 버전이 있습니다. 업데이트하시겠습니까?')) {
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      window.location.reload();
    }
  },
});
