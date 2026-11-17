const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const key = () => process.env.GEMINI_API_KEY;
const CHAT = () => process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
const EMBED = () => process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';

async function call(path, body) {
  const r = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key() },
    body: JSON.stringify(body)
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${json?.error?.message || 'error desconocido'}`);
  return json;
}

// Vectores de 768 dimensiones (coinciden con vector(768) en la BD)
export async function embed(texts, taskType = 'RETRIEVAL_DOCUMENT') {
  const out = [];
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100);
    const json = await call(`models/${EMBED()}:batchEmbedContents`, {
      requests: batch.map(t => ({
        model: `models/${EMBED()}`,
        content: { parts: [{ text: t }] },
        taskType,
        outputDimensionality: 768
      }))
    });
    out.push(...json.embeddings.map(e => e.values));
  }
  return out;
}

export async function generate({ system, history = [], prompt, json = false, temperature = 0.2 }) {
  const contents = [...history, { role: 'user', parts: [{ text: prompt }] }];
  const body = {
    contents,
    generationConfig: { temperature, ...(json ? { responseMimeType: 'application/json' } : {}) }
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const j = await call(`models/${CHAT()}:generateContent`, body);
  return j.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
}

export function chunkText(text, size = 1000, overlap = 150) {
  const clean = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  const chunks = [];
  for (let i = 0; i < clean.length; i += size - overlap) {
    const c = clean.slice(i, i + size).trim();
    if (c.length > 40) chunks.push(c);
  }
  return chunks;
}
