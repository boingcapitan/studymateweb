import { useEffect, useRef, useState } from 'react';
import { apiSend } from '../api.js';

const HINTS = ['¿Qué entregas tengo esta semana?', '¿Qué clase tengo mañana?', '¿Cómo me evalúan en mis materias?'];

export default function Chat({ online }) {
  const [msgs, setMsgs] = useState([{ role: 'assistant', text: 'Hola, soy StudyMate. Pregúntame por tus entregas, tu horario o lo que dice tu syllabus.' }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  async function send(q) {
    const message = (q ?? text).trim();
    if (!message || busy) return;
    const history = msgs.slice(1);
    setMsgs(m => [...m, { role: 'user', text: message }]); setText(''); setBusy(true);
    try {
      const r = await apiSend('POST', '/api/chat', { message, history });
      setMsgs(m => [...m, { role: 'assistant', text: r.answer }]);
    } catch (e) { setMsgs(m => [...m, { role: 'assistant', text: e.message, error: true }]); }
    setBusy(false);
  }

  return (
    <section className="chat">
      <h2>Asistente</h2>
      <div className="msgs" aria-live="polite">
        {msgs.map((m, i) => <div key={i} className={`bubble ${m.role} ${m.error ? 'error' : ''}`}>{m.text}</div>)}
        {busy && <div className="bubble assistant muted">Pensando…</div>}
        <div ref={end} />
      </div>
      {msgs.length === 1 && <div className="hints">{HINTS.map(h => <button key={h} className="chip" onClick={() => send(h)} disabled={!online}>{h}</button>)}</div>}
      <form className="composer" onSubmit={e => { e.preventDefault(); send(); }}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder={online ? 'Escribe tu pregunta…' : 'Sin conexión'} maxLength={1000} disabled={!online} aria-label="Mensaje" />
        <button className="primary" disabled={busy || !online}>Enviar</button>
      </form>
    </section>
  );
}
