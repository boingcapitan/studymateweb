import { Router } from 'express';
import { supabase } from '../supabase.js';
import { logEvent } from '../auth.js';
import { sendToUser } from '../lib/fcm.js';
const r = Router();

r.post('/register', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Falta token' });
  const { error } = await supabase.from('push_tokens').upsert({ token, user_id: req.user.id });
  if (error) return res.status(500).json({ error: error.message });
  await logEvent(req.user.id, 'push_enabled');
  res.status(204).end();
});

r.post('/test', async (req, res) => {
  const n = await sendToUser(req.user.id, 'StudyMateWeb', '¡Las notificaciones funcionan! 🎉');
  res.json({ sent: n });
});
export default r;
