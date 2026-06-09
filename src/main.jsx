import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 🚀 REGISTER YOUR NATIVE SERVICE WORKER FOR OFFLINE AND PWA CAPABILITIES
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("ServiceWorker successfully registered with scope control matrix:", registration.scope);
      })
      .catch((error) => {
        console.error("ServiceWorker registration failed safely:", error);
      });
  });
}

