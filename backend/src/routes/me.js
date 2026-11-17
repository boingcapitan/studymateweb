import { Router } from 'express';
import { supabase } from '../supabase.js';
import { logEvent } from '../auth.js';
const r = Router();
r.get('/', async (req, res) => {
  const { data } = await supabase.from('profiles').select('full_name, group_type').eq('id', req.user.id).single();
  res.json({ id: req.user.id, email: req.user.email, ...data });
});
r.post('/session', async (req, res) => { await logEvent(req.user.id, 'session'); res.status(204).end(); });
export default r;
