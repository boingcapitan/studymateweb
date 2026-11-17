import { Router } from 'express';
import { supabase } from '../supabase.js';
import { requireAuth } from '../auth.js';
const r = Router();

const esc = s => String(s ?? '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
const stamp = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

// Devuelve la URL personal de suscripción (para Google Calendar / Apple / Outlook)
r.get('/link', requireAuth, async (req, res) => {
  const { data } = await supabase.from('profiles').select('ical_token').eq('id', req.user.id).single();
  const base = process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
  res.json({ url: `${base}/api/ical/${data.ical_token}.ics` });
});

// Feed público protegido por token secreto (los calendarios no envían cabeceras)
r.get('/:token.ics', async (req, res) => {
  const { data: p } = await supabase.from('profiles').select('id').eq('ical_token', req.params.token).maybeSingle();
  if (!p) return res.status(404).send('No encontrado');
  const { data: tasks } = await supabase.from('tasks').select('*').eq('user_id', p.id).eq('status', 'pending');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//StudyMateWeb//ES', 'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:StudyMateWeb – Entregas', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H'];
  for (const t of tasks || []) {
    const end = new Date(t.due_at), start = new Date(end.getTime() - 3600e3);
    lines.push('BEGIN:VEVENT', `UID:${t.id}@studymateweb`, `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${esc('📌 ' + t.title)}`,
      `DESCRIPTION:${esc([t.subject, t.description].filter(Boolean).join(' – '))}`,
      'BEGIN:VALARM', 'TRIGGER:-PT24H', 'ACTION:DISPLAY', 'DESCRIPTION:Entrega mañana', 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  res.set({ 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-cache' }).send(lines.join('\r\n'));
});
export default r;
