import { get as idbGet, set as idbSet } from 'idb-keyval';
import { supabase } from './supabase.js';

const BASE = import.meta.env.VITE_API_URL;

async function headers(extra = {}) {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token}`, ...extra };
}

// GET con caché offline en IndexedDB: si no hay red, devuelve la última copia guardada
export async function apiGet(path) {
  try {
    const r = await fetch(BASE + path, { headers: await headers() });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Error del servidor');
    const data = await r.json();
    idbSet('cache:' + path, data);
    return data;
  } catch (e) {
    const cached = await idbGet('cache:' + path);
    if (cached) return cached;
    throw e;
  }
}

export async function apiSend(method, path, body, isForm = false) {
  const r = await fetch(BASE + path, {
    method,
    headers: await headers(isForm ? {} : { 'Content-Type': 'application/json' }),
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined
  });
  if (r.status === 204) return null;
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}
