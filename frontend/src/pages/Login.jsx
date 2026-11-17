import { useState } from 'react';
import { supabase } from '../supabase.js';

export default function Login() {
  const [mode, setMode] = useState('in');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg('');
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
      if (error) setMsg('Correo o contraseña incorrectos.');
    } else {
      const { data, error } = await supabase.auth.signUp({ email: f.email, password: f.password, options: { data: { full_name: f.name } } });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.');
    }
    setBusy(false);
  }

  return (
    <div className="center">
      <form className="card login" onSubmit={submit}>
        <h1>StudyMate</h1>
        <p className="muted">Tu horario, tus entregas y un asistente que conoce tu syllabus.</p>
        {mode === 'up' && <label>Nombre<input value={f.name} onChange={set('name')} required autoComplete="name" /></label>}
        <label>Correo<input type="email" value={f.email} onChange={set('email')} required autoComplete="email" /></label>
        <label>Contraseña<input type="password" minLength={6} value={f.password} onChange={set('password')} required autoComplete={mode === 'in' ? 'current-password' : 'new-password'} /></label>
        {msg && <p className="error" role="alert">{msg}</p>}
        <button className="primary" disabled={busy}>{mode === 'in' ? 'Iniciar sesión' : 'Crear cuenta'}</button>
        <button type="button" className="link" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(''); }}>
          {mode === 'in' ? 'No tengo cuenta' : 'Ya tengo cuenta'}
        </button>
      </form>
    </div>
  );
}
