import { Router } from 'express';
import { supabase } from '../supabase.js';
import { logEvent } from '../auth.js';
const r = Router();

r.get('/', async (req, res) => {
  const { data, error } = await supabase.from('tasks').select('*')
    .eq('user_id', req.user.id).order('due_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

r.post('/', async (req, res) => {
  const { title, subject, description, due_at } = req.body;
  if (!title || !due_at) return res.status(400).json({ error: 'title y due_at son obligatorios' });
  const { data, error } = await supabase.from('tasks')
    .insert({ user_id: req.user.id, title, subject, description, due_at }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Importación masiva (la usa la ingesta de syllabus tras confirmar)
r.post('/bulk', async (req, res) => {
  const items = (req.body.tasks || []).filter(t => t.title && t.due_at).map(t => ({
    user_id: req.user.id, title: t.title, subject: t.subject || null,
    description: t.description || null, due_at: t.due_at, source: 'syllabus'
  }));
  if (!items.length) return res.status(400).json({ error: 'No hay tareas válidas' });
  const { data, error } = await supabase.from('tasks').insert(items).select();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

r.patch('/:id', async (req, res) => {
  const patch = {};
  for (const k of ['title', 'subject', 'description', 'due_at']) if (k in req.body) patch[k] = req.body[k];
  if ('due_at' in patch) { patch.reminded_24h = false; patch.reminded_2h = false; }
  if (req.body.status === 'done') { patch.status = 'done'; patch.completed_at = new Date().toISOString(); }
  if (req.body.status === 'pending') { patch.status = 'pending'; patch.completed_at = null; }
  const { data, error } = await supabase.from('tasks').update(patch)
    .eq('id', req.params.id).eq('user_id', req.user.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  if (patch.status === 'done') {
    await logEvent(req.user.id, 'task_done', { id: data.id, late: new Date(data.completed_at) > new Date(data.due_at) });
  }
  res.json(data);
});

r.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('tasks').delete().eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});
export default r;
