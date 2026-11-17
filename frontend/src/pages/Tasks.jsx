import { useEffect, useState } from 'react';
import { apiGet, apiSend } from '../api.js';

const fmt = d => new Date(d).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const empty = { title: '', subject: '', due: '' };

export default function Tasks({ online }) {
  const [tasks, setTasks] = useState([]);
  const [f, setF] = useState(empty);
  const [err, setErr] = useState('');
  const load = () => apiGet('/api/tasks').then(setTasks).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault(); setErr('');
    try {
      await apiSend('POST', '/api/tasks', { title: f.title, subject: f.subject, due_at: new Date(f.due).toISOString() });
      setF(empty); load();
    } catch (x) { setErr(x.message); }
  }
  const toggle = t => apiSend('PATCH', `/api/tasks/${t.id}`, { status: t.status === 'done' ? 'pending' : 'done' }).then(load).catch(x => setErr(x.message));
  const del = t => confirm(`¿Borrar "${t.title}"?`) && apiSend('DELETE', `/api/tasks/${t.id}`).then(load).catch(x => setErr(x.message));

  const now = Date.now();
  const pending = tasks.filter(t => t.status === 'pending');
  const groups = [
    ['Vencidas', pending.filter(t => new Date(t.due_at) < now), 'late'],
    ['Próximas', pending.filter(t => new Date(t.due_at) >= now), ''],
    ['Entregadas', tasks.filter(t => t.status === 'done').reverse(), 'done']
  ];

  return (
    <section>
      <h2>Tareas</h2>
      <form className="card row" onSubmit={add}>
        <label className="grow">Tarea<input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} required maxLength={120} /></label>
        <label>Materia<input value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} maxLength={60} /></label>
        <label>Entrega<input type="datetime-local" value={f.due} onChange={e => setF({ ...f, due: e.target.value })} required /></label>
        <button className="primary" disabled={!online}>Agregar</button>
      </form>
      {err && <p className="error" role="alert">{err}</p>}
      {!tasks.length && <p className="muted">Aún no tienes tareas. Agrega una arriba o sube tu syllabus en la pestaña Syllabus.</p>}
      {groups.map(([title, list, cls]) => list.length > 0 && (
        <div key={title}>
          <h3 className={cls}>{title} ({list.length})</h3>
          <ul className="list">
            {list.map(t => {
              const soon = !cls && new Date(t.due_at) - now < 48 * 3600e3;
              return (
                <li key={t.id} className={`item ${cls}`}>
                  <input type="checkbox" checked={t.status === 'done'} onChange={() => toggle(t)} disabled={!online} aria-label={`Marcar "${t.title}" como entregada`} />
                  <div className="grow">
                    <strong>{t.title}</strong>
                    <div className="muted small">{t.subject && `${t.subject} · `}<span className={soon ? 'hl' : ''}>{fmt(t.due_at)}</span></div>
                  </div>
                  <button className="link" onClick={() => del(t)} disabled={!online} aria-label="Borrar">Borrar</button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
