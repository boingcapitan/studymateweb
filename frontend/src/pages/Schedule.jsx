import { useEffect, useState } from 'react';
import { apiGet, apiSend } from '../api.js';

const DAYS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const empty = { subject: '', day_of_week: 1, start_time: '08:00', end_time: '09:00', room: '' };

export default function Schedule({ online }) {
  const [items, setItems] = useState([]);
  const [f, setF] = useState(empty);
  const [err, setErr] = useState('');
  const load = () => apiGet('/api/schedule').then(setItems).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault(); setErr('');
    if (f.end_time <= f.start_time) return setErr('La hora de fin debe ser después de la hora de inicio.');
    try { await apiSend('POST', '/api/schedule', { ...f, day_of_week: Number(f.day_of_week) }); setF(empty); load(); }
    catch (x) { setErr(x.message); }
  }
  const del = i => apiSend('DELETE', `/api/schedule/${i.id}`).then(load).catch(x => setErr(x.message));
  const today = ((new Date().getDay() + 6) % 7) + 1;

  return (
    <section>
      <h2>Horario semanal</h2>
      <form className="card row" onSubmit={add}>
        <label className="grow">Materia<input value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} required /></label>
        <label>Día<select value={f.day_of_week} onChange={e => setF({ ...f, day_of_week: e.target.value })}>
          {DAYS.slice(1).map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select></label>
        <label>Inicio<input type="time" value={f.start_time} onChange={e => setF({ ...f, start_time: e.target.value })} required /></label>
        <label>Fin<input type="time" value={f.end_time} onChange={e => setF({ ...f, end_time: e.target.value })} required /></label>
        <label>Salón<input value={f.room} onChange={e => setF({ ...f, room: e.target.value })} /></label>
        <button className="primary" disabled={!online}>Agregar</button>
      </form>
      {err && <p className="error" role="alert">{err}</p>}
      {!items.length && <p className="muted">Todavía no hay clases en tu horario.</p>}
      {DAYS.slice(1).map((d, i) => {
        const list = items.filter(x => x.day_of_week === i + 1);
        if (!list.length) return null;
        return (
          <div key={d}>
            <h3 className={i + 1 === today ? 'hl' : ''}>{d}{i + 1 === today && ' (hoy)'}</h3>
            <ul className="list">{list.map(x => (
              <li key={x.id} className="item">
                <div className="grow"><strong>{x.subject}</strong>
                  <div className="muted small">{x.start_time.slice(0, 5)} – {x.end_time.slice(0, 5)}{x.room && ` · ${x.room}`}</div></div>
                <button className="link" onClick={() => del(x)} disabled={!online}>Borrar</button>
              </li>))}</ul>
          </div>
        );
      })}
    </section>
  );
}
