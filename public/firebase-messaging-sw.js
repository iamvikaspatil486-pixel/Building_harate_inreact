importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBUOY-y9cqFqjBOIQbzms6sr7zCofod1QU",
  authDomain: "original-harate.firebaseapp.com",
  projectId: "original-harate",
  storageBucket: "original-harate.firebasestorage.app",
  messagingSenderId: "484091091861",
  appId: "1:484091091861:web:95da49ae32cddfd385b49c"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  // Close existing notifications first to keep the layout clean
  self.registration.getNotifications({ tag: 'chat-message' }).then(function(notifications) {
    notifications.forEach(function(n) { n.close() })
  })

  const title = payload.notification.title
  const body = payload.notification.body

  self.registration.showNotification(title, {
    body: body,
    icon: '/logo192.png',      // 🚀 TWEAK 1: Matches your public directory icon name
    tag: 'chat-message',        
    renotify: true,             
    badge: '/logo192.png',     // 🚀 TWEAK 2: Matches your public directory icon name
    data: { url: '/chat' }     // 🚀 TWEAK 3: Changed '/chat.html' to your React path '/chat'
  })
})

// Click notification → open the active chat path inside your React layout
self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  
  // 🚀 TWEAK 4: Updated to your exact single-page router endpoint path
  const targetUrl = '/chat'; 

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      // If the student already has Harate open in a tab, focus it instead of opening a duplicate
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // If the app is completely closed, open a fresh window pointing to the chat route
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
})

