import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { apiSend } from './api.js';

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export async function pushSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator && (await isSupported().catch(() => false));
}

export async function enablePush() {
  if (!(await pushSupported())) throw new Error('Este navegador no soporta notificaciones push. En iPhone, instala la app en la pantalla de inicio primero.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Permiso denegado. Actívalo en los ajustes del navegador para este sitio.');

  const q = new URLSearchParams(cfg).toString();
  const reg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${q}`);
  await navigator.serviceWorker.ready;

  const messaging = getMessaging(initializeApp(cfg));
  const token = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY, serviceWorkerRegistration: reg });
  if (!token) throw new Error('No se pudo obtener el token de notificaciones.');
  await apiSend('POST', '/api/push/register', { token });

  // Con la app abierta, FCM no muestra la notificación sola: la mostramos nosotros
  onMessage(messaging, p => reg.showNotification(p.notification?.title || 'StudyMateWeb', { body: p.notification?.body, icon: '/icon-192.png' }));
  return token;
}
