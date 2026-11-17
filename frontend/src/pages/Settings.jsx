import { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { apiGet, apiSend } from '../api.js';
import { enablePush } from '../push.js';

const SUS = ['Creo que me gustaría usar este sistema con frecuencia.', 'Encontré el sistema innecesariamente complejo.', 'Pensé que el sistema era fácil de usar.',
  'Creo que necesitaría apoyo de un experto para usar este sistema.', 'Encontré que las funciones del sistema estaban bien integradas.', 'Pensé que había demasiada inconsistencia en el sistema.',
  'Imagino que la mayoría de las personas aprendería a usar este sistema rápidamente.', 'Encontré el sistema muy incómodo de usar.', 'Me sentí muy seguro/a usando el sistema.',
  'Necesité aprender muchas cosas antes de poder usar el sistema.'];
const TAM = ['Usar StudyMateWeb me ayuda a cumplir mis entregas a tiempo.', 'StudyMateWeb mejora mi organización académica.', 'StudyMateWeb me resulta útil en mis estudios.',
  'Aprender a usar StudyMateWeb fue fácil para mí.', 'Mi interacción con StudyMateWeb es clara y comprensible.', 'Me resulta fácil lograr que StudyMateWeb haga lo que necesito.'];

function Survey({ kind, items, onDone }) {
  const [a, setA] = useState(Array(items.length).fill(0));
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault();
    if (a.includes(0)) return setErr('Responde todas las preguntas.');
    try { await apiSend('POST', '/api/surveys', { kind, answers: a }); onDone(`¡Gracias! Respuestas de ${kind} guardadas.`); }
    catch (x) { setErr(x.message); }
  }
  return (
    <form onSubmit={submit} className="card">
      <h3>{kind === 'SUS' ? 'Cuestionario de usabilidad (SUS)' : 'Cuestionario de aceptación (TAM)'}</h3>
      <p className="muted small">1 = totalmente en desacuerdo · 5 = totalmente de acuerdo</p>
      {items.map((q, i) => (
        <fieldset key={i}><legend>{i + 1}. {q}</legend>
          <div className="likert">{[1, 2, 3, 4, 5].map(v => (
            <label key={v}><input type="radio" name={`${kind}${i}`} checked={a[i] === v} onChange={() => setA(a.map((x, j) => j === i ? v : x))} />{v}</label>))}</div>
        </fieldset>))}
      {err && <p className="error" role="alert">{err}</p>}
      <button className="primary">Enviar</button>
    </form>
  );
}

export default function Settings({ me, online }) {
  const [msg, setMsg] = useState('');
  const [ical, setIcal] = useState('');
  const [survey, setSurvey] = useState(null);
  const [install, setInstall] = useState(null);
  useEffect(() => {
    apiGet('/api/ical/link').then(r => setIcal(r.url)).catch(() => {});
    const h = e => { e.preventDefault(); setInstall(e); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);

  const run = fn => async () => { try { setMsg(await fn()); } catch (e) { setMsg(e.message); } };
  const turnOn = run(async () => { await enablePush(); return 'Notificaciones activadas en este dispositivo.'; });
  const test = run(async () => { const r = await apiSend('POST', '/api/push/test'); return r.sent ? 'Te envié una notificación de prueba.' : 'No hay dispositivos registrados. Activa las notificaciones primero.'; });
  const copy = run(async () => { await navigator.clipboard.writeText(ical); return 'Enlace copiado.'; });

  if (survey) return <section><button className="link" onClick={() => setSurvey(null)}>← Volver</button>
    <Survey kind={survey} items={survey === 'SUS' ? SUS : TAM} onDone={m => { setMsg(m); setSurvey(null); }} /></section>;

  return (
    <section>
      <h2>Ajustes</h2>
      <p className="muted">{me?.full_name} · {me?.email}</p>
      {msg && <p className="notice" role="status">{msg}</p>}

      <div className="card"><h3>Notificaciones</h3>
        <p>Recibe un aviso 24 horas y 2 horas antes de cada entrega, aunque la app esté cerrada.</p>
        <div className="row"><button className="primary" onClick={turnOn} disabled={!online}>Activar en este dispositivo</button>
          <button onClick={test} disabled={!online}>Enviar prueba</button></div></div>

      <div className="card"><h3>Calendario (iCal)</h3>
        <p>Suscribe tus entregas en Google Calendar, Apple Calendar u Outlook con este enlace privado (no lo compartas).</p>
        <input readOnly value={ical} onFocus={e => e.target.select()} aria-label="Enlace iCal" />
        <button onClick={copy} disabled={!ical}>Copiar enlace</button></div>

      {install && <div className="card"><h3>Instalar app</h3>
        <button className="primary" onClick={() => { install.prompt(); setInstall(null); }}>Instalar StudyMate</button></div>}

      <div className="card"><h3>Evaluación del sistema</h3>
        <p>Ayúdanos contestando estos cuestionarios al final del periodo (2 minutos cada uno).</p>
        <div className="row"><button onClick={() => setSurvey('SUS')}>Usabilidad (SUS)</button><button onClick={() => setSurvey('TAM')}>Aceptación (TAM)</button></div></div>

      <button onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
    </section>
  );
}
