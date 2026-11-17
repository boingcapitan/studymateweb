// Service worker de Firebase Cloud Messaging (notificaciones en segundo plano).
// La configuración llega por la URL de registro (ver src/push.js), así no hay claves hardcodeadas.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const p = new URL(self.location.href).searchParams;
firebase.initializeApp({
  apiKey: p.get('apiKey'),
  projectId: p.get('projectId'),
  messagingSenderId: p.get('messagingSenderId'),
  appId: p.get('appId')
});
firebase.messaging(); // FCM muestra automáticamente las notificaciones con payload "notification"

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return clients.openWindow('/');
  }));
});
