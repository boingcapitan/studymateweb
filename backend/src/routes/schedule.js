import { Router } from 'express';
import { supabase } from '../supabase.js';
const r = Router();

r.get('/', async (req, res) => {
  const { data, error } = await supabase.from('schedule_entries').select('*')
    .eq('user_id', req.user.id).order('day_of_week').order('start_time');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

r.post('/', async (req, res) => {
  const { subject, day_of_week, start_time, end_time, room } = req.body;
  if (!subject || !day_of_week || !start_time || !end_time)
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  const { data, error } = await supabase.from('schedule_entries')
    .insert({ user_id: req.user.id, subject, day_of_week, start_time, end_time, room }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

r.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('schedule_entries').delete()
    .eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});
export default r;
