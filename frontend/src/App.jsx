import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { apiGet, apiSend } from './api.js';
import Login from './pages/Login.jsx';
import Tasks from './pages/Tasks.jsx';
import Schedule from './pages/Schedule.jsx';
import Syllabus from './pages/Syllabus.jsx';
import Chat from './pages/Chat.jsx';
import Settings from './pages/Settings.jsx';

const TABS = [
  ['tasks', 'Tareas', '✓'], ['schedule', 'Horario', '▦'], ['syllabus', 'Syllabus', '⬆'],
  ['chat', 'Asistente', '✦'], ['settings', 'Ajustes', '⚙']
];

export default function App() {
  const [session, setSession] = useState(undefined);
  const [tab, setTab] = useState('tasks');
  const [online, setOnline] = useState(navigator.onLine);
  const [me, setMe] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { sub.subscription.unsubscribe(); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (!session) return setMe(null);
    apiGet('/api/me').then(setMe).catch(() => {});
    apiSend('POST', '/api/me/session').catch(() => {});   // bitácora de sesiones
  }, [session?.user?.id]);

  if (session === undefined) return <div className="center muted">Cargando…</div>;
  if (!session) return <Login />;

  const Page = { tasks: Tasks, schedule: Schedule, syllabus: Syllabus, chat: Chat, settings: Settings }[tab];
  return (
    <div className="shell">
      <nav className="nav" aria-label="Secciones">
        <div className="brand">StudyMate</div>
        {TABS.map(([id, label, icon]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)} aria-current={tab === id}>
            <span aria-hidden>{icon}</span><span>{label}</span>
          </button>
        ))}
      </nav>
      <main className="main">
        {!online && <div className="banner">Sin conexión: verás la última información guardada. Para guardar cambios necesitas internet.</div>}
        <Page me={me} online={online} goTo={setTab} />
      </main>
    </div>
  );
}
