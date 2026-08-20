import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// Eruda mobile debugger — remove before production
// In main.jsx or App.jsx at top
if (typeof window !== 'undefined') {
  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  if (currentUser?.roll === '195') {
    const script = document.createElement('script');
    script.src = '//cdn.jsdelivr.net/npm/eruda';
    script.onload = () => window.eruda.init();
    document.head.appendChild(script);
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // PWA service worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("SW registered:", reg.scope))
      .catch((err) => console.error("SW failed:", err));

    // Firebase messaging service worker
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js")
      .then((reg) => console.log("FCM SW registered:", reg.scope))
      .catch((err) => console.error("FCM SW failed:", err));
  });
}
