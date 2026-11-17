import { Router } from 'express';
import { supabase } from '../supabase.js';
import { sendToUser } from '../lib/fcm.js';
import { logEvent } from '../auth.js';
const r = Router();

// Llamar cada 15 min desde un cron externo con el header x-cron-secret
r.get('/reminders', async (req, res) => {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) return res.status(401).json({ error: 'No autorizado' });
  const now = Date.now();
  const iso = ms => new Date(now + ms).toISOString();
  let sent = 0;

  const rules = [
    { flag: 'reminded_24h', from: iso(2 * 3600e3), to: iso(24 * 3600e3), label: 'mañana' },
    { flag: 'reminded_2h', from: iso(0), to: iso(2 * 3600e3), label: 'en menos de 2 horas' }
  ];
  for (const rule of rules) {
    const { data: tasks } = await supabase.from('tasks').select('id, user_id, title, due_at')
      .eq('status', 'pending').eq(rule.flag, false).gt('due_at', rule.from).lte('due_at', rule.to);
    for (const t of tasks || []) {
      const n = await sendToUser(t.user_id, 'Entrega próxima', `"${t.title}" vence ${rule.label}.`, '/');
      await supabase.from('tasks').update({ [rule.flag]: true, ...(rule.flag === 'reminded_2h' ? { reminded_24h: true } : {}) }).eq('id', t.id);
      if (n) { sent += n; await logEvent(t.user_id, 'push_sent', { task: t.id, kind: rule.flag }); }
    }
  }
  res.json({ ok: true, sent });
});
export default r;
