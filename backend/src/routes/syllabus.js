import { Router } from 'express';
import multer from 'multer';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { supabase } from '../supabase.js';
import { embed, generate, chunkText } from '../lib/gemini.js';
import { logEvent } from '../auth.js';

const r = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

r.get('/', async (req, res) => {
  const { data, error } = await supabase.from('documents').select('id, filename, created_at')
    .eq('user_id', req.user.id).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Sube un PDF: extrae texto, lo vectoriza (RAG) y propone tareas con fechas
r.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Adjunta un archivo PDF' });
    if (req.file.mimetype !== 'application/pdf') return res.status(400).json({ error: 'Solo se aceptan PDF' });

    const parsed = await pdf(req.file.buffer);
    const text = (parsed.text || '').trim();
    if (text.length < 50) return res.status(422).json({ error: 'El PDF no tiene texto legible (¿es un escaneo?). Usa uno con texto seleccionable.' });

    const { data: doc, error: dErr } = await supabase.from('documents')
      .insert({ user_id: req.user.id, filename: req.file.originalname }).select().single();
    if (dErr) throw new Error(dErr.message);

    const pieces = chunkText(text).slice(0, 200);
    const vectors = await embed(pieces, 'RETRIEVAL_DOCUMENT');
    const rows = pieces.map((content, i) => ({
      document_id: doc.id, user_id: req.user.id, content, embedding: vectors[i]
    }));
    for (let i = 0; i < rows.length; i += 50) {
      const { error } = await supabase.from('chunks').insert(rows.slice(i, i + 50));
      if (error) throw new Error(error.message);
    }

    const today = new Date().toISOString().slice(0, 10);
    const raw = await generate({
      json: true,
      system: 'Extraes tareas, trabajos, exámenes y entregas con fecha de un programa de estudios (syllabus). Respondes SOLO JSON válido.',
      prompt: `Hoy es ${today}. Del siguiente texto extrae cada entrega/examen/proyecto que tenga fecha.
Devuelve un arreglo JSON: [{"title": string, "subject": string|null, "due_date": "YYYY-MM-DD", "description": string|null}].
Si la fecha no trae año, asume el año más cercano a hoy. No inventes fechas: omite lo que no tenga fecha. Si no hay nada, devuelve [].

TEXTO:
${text.slice(0, 30000)}`
    });

    let proposals = [];
    try {
      const arr = JSON.parse(raw.replace(/```json|```/g, '').trim());
      proposals = (Array.isArray(arr) ? arr : []).filter(t => t.title && /^\d{4}-\d{2}-\d{2}$/.test(t.due_date))
        .map(t => ({ ...t, due_at: `${t.due_date}T23:59:00-06:00` }));
    } catch { proposals = []; }

    await logEvent(req.user.id, 'syllabus_upload', { chunks: pieces.length, proposals: proposals.length });
    res.json({ document: doc, proposals });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

r.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('documents').delete().eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});
export default r;
