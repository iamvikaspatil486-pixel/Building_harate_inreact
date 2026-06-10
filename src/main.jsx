import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

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
