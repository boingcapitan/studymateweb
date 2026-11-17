import { Router } from 'express';
import { supabase } from '../supabase.js';
import { embed, generate } from '../lib/gemini.js';
import { logEvent } from '../auth.js';

const r = Router();
const TZ = 'America/Mexico_City';
const fmt = d => new Date(d).toLocaleString('es-MX', { timeZone: TZ, dateStyle: 'full', timeStyle: 'short' });
const DAYS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Chatbot RAG: datos estructurales del usuario + fragmentos de syllabus recuperados por similitud
r.post('/', async (req, res) => {
  try {
    const message = String(req.body.message || '').trim().slice(0, 1000);
    if (!message) return res.status(400).json({ error: 'Escribe un mensaje' });
    const history = (req.body.history || []).slice(-8).map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(h.text).slice(0, 1500) }]
    }));

    const [{ data: tasks }, { data: sched }, [qVec]] = await Promise.all([
      supabase.from('tasks').select('title, subject, due_at, status').eq('user_id', req.user.id).order('due_at').limit(100),
      supabase.from('schedule_entries').select('*').eq('user_id', req.user.id).order('day_of_week').order('start_time'),
      embed([message], 'RETRIEVAL_QUERY')
    ]);
    const { data: chunks } = await supabase.rpc('match_chunks', {
      query_embedding: qVec, p_user: req.user.id, match_count: 5
    });

    const tasksTxt = (tasks || []).map(t =>
      `- [${t.status === 'done' ? 'HECHA' : 'PENDIENTE'}] ${t.title}${t.subject ? ` (${t.subject})` : ''} — vence ${fmt(t.due_at)}`).join('\n') || '(sin tareas)';
    const schedTxt = (sched || []).map(s =>
      `- ${DAYS[s.day_of_week]} ${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}: ${s.subject}${s.room ? ` (${s.room})` : ''}`).join('\n') || '(sin horario)';
    const docsTxt = (chunks || []).filter(c => c.similarity > 0.35).map((c, i) => `[Fragmento ${i + 1}] ${c.content}`).join('\n\n') || '(sin fragmentos relevantes)';

    const system = `Eres StudyMate, asistente académico de un estudiante. Hoy es ${fmt(new Date())} (zona ${TZ}).
REGLAS: responde SOLO con la información del CONTEXTO. Si el dato no está, di claramente que no lo tienes registrado y sugiere agregarlo o subir el syllabus. Nunca inventes fechas, calificaciones ni requisitos. Sé breve, amable y en español de México. Cuando cites el syllabus, menciónalo.`;
    const prompt = `CONTEXTO
== TAREAS ==\n${tasksTxt}\n\n== HORARIO ==\n${schedTxt}\n\n== SYLLABUS (fragmentos) ==\n${docsTxt}\n\nPREGUNTA: ${message}`;

    const answer = await generate({ system, history, prompt, temperature: 0.1 });
    await logEvent(req.user.id, 'chat_query', { q_len: message.length, chunks: (chunks || []).length });
    res.json({ answer });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'El asistente no está disponible ahora. Intenta de nuevo en un minuto.' });
  }
});
export default r;
