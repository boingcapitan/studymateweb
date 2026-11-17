import admin from 'firebase-admin';
import { supabase } from '../supabase.js';

let ready = false;
function init() {
  if (ready) return true;
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return false;
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  ready = true;
  return true;
}

// Envía a todos los dispositivos del usuario y borra tokens inválidos
export async function sendToUser(userId, title, body, link = '/') {
  if (!init()) return 0;
  const { data } = await supabase.from('push_tokens').select('token').eq('user_id', userId);
  const tokens = (data || []).map(t => t.token);
  if (!tokens.length) return 0;
  const resp = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    webpush: { fcmOptions: { link: (process.env.FRONTEND_URL || '') + link }, notification: { icon: '/icon-192.png' } }
  });
  const dead = [];
  resp.responses.forEach((x, i) => {
    const c = x.error?.code;
    if (c === 'messaging/registration-token-not-registered' || c === 'messaging/invalid-registration-token') dead.push(tokens[i]);
  });
  if (dead.length) await supabase.from('push_tokens').delete().in('token', dead);
  return resp.successCount;
}
