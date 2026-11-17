import { Router } from 'express';
import { supabase } from '../supabase.js';
const r = Router();

// SUS: 10 respuestas 1-5. Impares (resp-1), pares (5-resp), suma × 2.5 => 0-100
export function susScore(a) {
  if (!Array.isArray(a) || a.length !== 10) return null;
  return a.reduce((s, v, i) => s + (i % 2 === 0 ? v - 1 : 5 - v), 0) * 2.5;
}

r.post('/', async (req, res) => {
  const { kind, answers } = req.body;
  if (!['SUS', 'TAM'].includes(kind)) return res.status(400).json({ error: 'Tipo inválido' });
  const ok = Array.isArray(answers) && answers.every(v => Number.isInteger(v) && v >= 1 && v <= 5);
  if (!ok || (kind === 'SUS' && answers.length !== 10)) return res.status(400).json({ error: 'Respuestas inválidas' });
  const score = kind === 'SUS' ? susScore(answers) : +(answers.reduce((a, b) => a + b, 0) / answers.length).toFixed(2);
  const { data, error } = await supabase.from('surveys').insert({ user_id: req.user.id, kind, answers, score }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});
export default r;
