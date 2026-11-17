import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { requireAuth } from './auth.js';
import tasks from './routes/tasks.js';
import schedule from './routes/schedule.js';
import syllabus from './routes/syllabus.js';
import chat from './routes/chat.js';
import push from './routes/push.js';
import cron from './routes/cron.js';
import ical from './routes/ical.js';
import surveys from './routes/surveys.js';
import me from './routes/me.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: (process.env.FRONTEND_URL || '').split(',').map(s => s.trim()), allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => res.json({ ok: true, service: 'StudyMateWeb API' }));  // health check / keep-alive

app.use('/api/cron', cron);
app.use('/api/ical', ical);                       // /link requiere auth; /:token.ics es público
app.use('/api/chat', rateLimit({ windowMs: 60_000, limit: 20 }));
app.use('/api/me', requireAuth, me);
app.use('/api/tasks', requireAuth, tasks);
app.use('/api/schedule', requireAuth, schedule);
app.use('/api/syllabus', requireAuth, syllabus);
app.use('/api/chat', requireAuth, chat);
app.use('/api/push', requireAuth, push);
app.use('/api/surveys', requireAuth, surveys);

app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Error interno' }); });
app.listen(process.env.PORT || 3000, () => console.log('API lista'));
