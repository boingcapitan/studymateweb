import { useEffect, useState } from 'react';
import { apiGet, apiSend } from '../api.js';

export default function Syllabus({ online, goTo }) {
  const [docs, setDocs] = useState([]);
  const [proposals, setProposals] = useState(null);
  const [checked, setChecked] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const load = () => apiGet('/api/syllabus').then(setDocs).catch(() => {});
  useEffect(() => { load(); }, []);

  async function upload(e) {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    setBusy(true); setMsg(''); setProposals(null);
    try {
      const fd = new FormData(); fd.append('file', file);
      const r = await apiSend('POST', '/api/syllabus/upload', fd, true);
      setProposals(r.proposals);
      setChecked(Object.fromEntries(r.proposals.map((_, i) => [i, true])));
      setMsg(r.proposals.length ? '' : 'Guardé el documento para el asistente, pero no encontré fechas de entrega.');
      load();
    } catch (x) { setMsg(x.message); }
    setBusy(false);
  }

  async function confirm() {
    const tasks = proposals.filter((_, i) => checked[i]);
    if (!tasks.length) return;
    try { await apiSend('POST', '/api/tasks/bulk', { tasks }); setProposals(null); goTo('tasks'); }
    catch (x) { setMsg(x.message); }
  }
  const delDoc = d => confirm_(d) && apiSend('DELETE', `/api/syllabus/${d.id}`).then(load);
  const confirm_ = d => window.confirm(`¿Borrar "${d.filename}" y su información del asistente?`);

  return (
    <section>
      <h2>Syllabus</h2>
      <div className="card">
        <p>Sube el programa de tu materia en PDF. Detectaré las fechas de entrega y el asistente podrá responder preguntas sobre el contenido.</p>
        <label className="file primary">{busy ? 'Procesando… (puede tardar un minuto)' : 'Elegir PDF'}
          <input type="file" accept="application/pdf" onChange={upload} disabled={busy || !online} hidden /></label>
      </div>
      {msg && <p className="error" role="alert">{msg}</p>}
      {proposals?.length > 0 && (
        <div className="card">
          <h3>Encontré {proposals.length} entregas. Revisa antes de agregarlas:</h3>
          <ul className="list">{proposals.map((p, i) => (
            <li key={i} className="item">
              <input type="checkbox" checked={!!checked[i]} onChange={() => setChecked({ ...checked, [i]: !checked[i] })} />
              <div className="grow"><strong>{p.title}</strong><div className="muted small">{p.subject && `${p.subject} · `}{p.due_date}</div></div>
            </li>))}</ul>
          <button className="primary" onClick={confirm}>Agregar seleccionadas a mis tareas</button>
        </div>
      )}
      {docs.length > 0 && <>
        <h3>Documentos cargados</h3>
        <ul className="list">{docs.map(d => (
          <li key={d.id} className="item"><div className="grow">{d.filename}<div className="muted small">{new Date(d.created_at).toLocaleDateString('es-MX')}</div></div>
            <button className="link" onClick={() => delDoc(d)} disabled={!online}>Borrar</button></li>))}</ul></>}
    </section>
  );
}
