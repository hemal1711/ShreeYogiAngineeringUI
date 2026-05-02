importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js');

try {
  importScripts('./ngsw-worker.js');
} catch {
  // ngsw-worker.js is generated only in production builds.
}

firebase.initializeApp({
  apiKey: 'AIzaSyD7pAbcRJZmf7gqOvSe27VK8mL6eIjywxQ',
  authDomain: 'shree-yogi-engineering.firebaseapp.com',
  projectId: 'shree-yogi-engineering',
  storageBucket: 'shree-yogi-engineering.firebasestorage.app',
  messagingSenderId: '1071510307840',
  appId: '1:1071510307840:web:395111d5f7960c04c304e5'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const link = payload.fcmOptions?.link || payload.data?.link || '/production-reports';

  self.registration.showNotification(notification.title || 'Production entry pending', {
    body: notification.body || 'Please add pending hourly production entry.',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/icon-96x96.png',
    data: { link }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/production-reports';
  event.waitUntil(clients.openWindow(link));
});
