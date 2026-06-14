import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBUOY-y9cqFqjBOIQbzms6sr7zCofod1QU",
  authDomain: "original-harate.firebaseapp.com",
  projectId: "original-harate",
  storageBucket: "original-harate.firebasestorage.app",
  messagingSenderId: "484091091861",
  appId: "1:484091091861:web:95da49ae32cddfd385b49c"
};

const app = initializeApp(firebaseConfig);

let messaging = null;
try {
  messaging = getMessaging(app);
} catch (err) {
  console.warn("Firebase messaging not available:", err);
}

export { messaging };
