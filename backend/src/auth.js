import { supabase } from './supabase.js';

// Verifica el JWT de Supabase enviado por el frontend y coloca req.user
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Falta el token de sesión' });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: 'Sesión inválida o expirada' });
  req.user = data.user;
  next();
}

export async function logEvent(userId, type, meta = {}) {
  try { await supabase.from('events').insert({ user_id: userId, type, meta }); } catch { /* no bloquear */ }
}
