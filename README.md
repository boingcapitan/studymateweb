# StudyMateWeb

PWA responsiva con chatbot RAG, ingesta de syllabus PDF, notificaciones Web Push (FCM) y feed iCal. Costo: $0 MXN.

```
studymateweb/
├── database/schema.sql      -> tablas, RLS, función de búsqueda vectorial, vista de puntualidad
├── backend/                 -> API Node + Express (se despliega en Render)
└── frontend/                -> React + Vite + PWA (se despliega en Vercel)
```

Cambios respecto al informe (para que funcione 100% y gratis): el chatbot usa **Gemini (API gratuita) + pgvector de Supabase** en lugar de Rasa/Dialogflow/LangChain, y el PDF se lee con `pdf-parse` en Node (sin Python). La arquitectura RAG es la misma: recuperar → inyectar contexto → generar sin inventar.

---
## PASO 1. Supabase (base de datos + login)
1. Entra a https://supabase.com → **Start your project** → crea cuenta (con GitHub o correo).
2. **New project**: nombre `studymateweb`, genera una contraseña de base de datos (guárdala), región `East US` o la más cercana. Espera ~2 min.
3. Menú izquierdo **SQL Editor → New query**. Pega TODO el contenido de `database/schema.sql` → **Run**. Debe decir "Success".
4. **Project Settings (engrane) → API**. Copia:
   - `Project URL`  → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY` (frontend)
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (SOLO backend, nunca la publiques)
5. **Authentication → Providers → Email**: para el piloto desactiva **Confirm email** (así los alumnos entran al instante). Si lo dejas activo, deben confirmar desde su correo.
6. **Authentication → URL Configuration**: en *Site URL* pon la URL de Vercel cuando la tengas (paso 6).

## PASO 2. Gemini (IA gratuita)
1. https://aistudio.google.com/apikey → **Create API key** → copia → `GEMINI_API_KEY`.
2. Si Google renombra modelos y obtienes error 404, cambia `GEMINI_CHAT_MODEL` / `GEMINI_EMBED_MODEL` por los vigentes (lista en https://ai.google.dev/gemini-api/docs/models). Importante: los vectores son de 768 dimensiones (el código ya lo fuerza).
3. Nota de privacidad: en el nivel gratuito Google puede usar los datos para mejorar sus modelos. Incluye esto en el consentimiento informado y no subas datos sensibles.

## PASO 3. Firebase (notificaciones push)
1. https://console.firebase.google.com → **Agregar proyecto** → nombre `studymateweb` (puedes desactivar Analytics).
2. Engrane → **Configuración del proyecto → General** → "Tus apps" → ícono **</>** (Web) → apodo `studymate-web` → Registrar. Copia de `firebaseConfig`:
   - `apiKey` → `VITE_FIREBASE_API_KEY`
   - `projectId` → `VITE_FIREBASE_PROJECT_ID`
   - `messagingSenderId` → `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` → `VITE_FIREBASE_APP_ID`
3. Pestaña **Cloud Messaging** → sección "Configuración web" → **Generar par de claves** → copia la clave pública → `VITE_FIREBASE_VAPID_KEY`.
4. Pestaña **Cuentas de servicio** → **Generar nueva clave privada** → se descarga un `.json`. Ábrelo, copia TODO su contenido y conviértelo a una sola línea (en https://www.text-utils.com/ o quitando saltos de línea a mano; los `\n` dentro de `private_key` deben quedar tal cual). Eso es `FIREBASE_SERVICE_ACCOUNT`.
5. Si en **APIs de Google Cloud** aparece "Firebase Cloud Messaging API (V1)" deshabilitada, habilítala.

## PASO 4. Probar en tu computadora
Requisitos: Node.js 18+ (https://nodejs.org, versión LTS).
```bash
# Terminal 1 - backend
cd backend
cp .env.example .env      # abre .env y llena los valores
npm install
npm run dev               # debe decir "API lista"

# Terminal 2 - frontend
cd frontend
cp .env.example .env      # llena los valores (VITE_API_URL=http://localhost:3000)
npm install
npm run dev               # abre http://localhost:5173
```
Prueba: crea cuenta → agrega horario y tarea → Syllabus (sube un PDF con texto) → Asistente → Ajustes → "Activar en este dispositivo" → "Enviar prueba".

## PASO 5. Subir a GitHub
```bash
cd studymateweb
git init && git add . && git commit -m "StudyMateWeb"
```
Crea un repo vacío en github.com y sigue las instrucciones "push an existing repository". Los `.env` NO se suben (están en .gitignore).

## PASO 6. Desplegar backend en Render (gratis)
1. https://render.com → entra con GitHub → **New + → Web Service** → elige tu repo.
2. `Root Directory`: `backend` · `Build Command`: `npm install` · `Start Command`: `npm start` · Instance type: **Free**.
3. **Environment**: agrega TODAS las variables de `backend/.env.example` con valores reales. `FRONTEND_URL` = URL de Vercel (paso 7; puedes poner la de localhost y actualizarla luego). `PUBLIC_API_URL` = la URL que te dé Render (`https://xxxx.onrender.com`). `CRON_SECRET` = una cadena larga aleatoria.
4. Deploy. Al terminar, abre la URL: debe mostrar `{"ok":true,"service":"StudyMateWeb API"}`.
> El plan gratis "duerme" tras 15 min sin tráfico (primer acceso tarda ~50 s). El cron del paso 8 lo mantiene despierto.

## PASO 7. Desplegar frontend en Vercel (gratis)
1. https://vercel.com → entra con GitHub → **Add New → Project** → tu repo.
2. `Root Directory`: `frontend` · Framework: Vite (autodetectado).
3. **Environment Variables**: las 8 de `frontend/.env.example`. `VITE_API_URL` = URL de Render (sin `/` final).
4. Deploy. Copia la URL final (`https://xxx.vercel.app`) y:
   - Pégala en `FRONTEND_URL` en Render (si son varias, sepáralas con coma) → Render redeploya solo.
   - Pégala en Supabase → Authentication → URL Configuration → Site URL.
5. Firebase → Authentication no se usa; no necesitas más ajustes de dominio.

## PASO 8. Recordatorios automáticos (cron gratis)
1. https://cron-job.org → crea cuenta → **Create cronjob**.
2. URL: `https://TU-API.onrender.com/api/cron/reminders` · Cada **15 minutos**.
3. **Advanced → Headers**: nombre `x-cron-secret`, valor = tu `CRON_SECRET`. Method GET. Guardar.
4. Revisa el historial: debe responder `200` con `{"ok":true,"sent":N}`.
Envía aviso 24 h y 2 h antes de cada entrega pendiente (una sola vez por aviso).

## PASO 9. Uso en el experimento
- **Asignar grupos**: Supabase → Table Editor → `profiles` → cambia `group_type` a `control` o `experimental` por alumno. (El grupo control puede registrarse solo para medir puntualidad y contestar SUS/TAM, o llevar un registro en papel; defínelo con tu docente.)
- **Móviles**: Android/Chrome: menú ⋮ → "Instalar app". iPhone: Safari → Compartir → "Agregar a pantalla de inicio" (las notificaciones push en iOS SOLO funcionan con la app instalada así, iOS 16.4+).
- **Datos para SPSS/R**: Table Editor → tabla o vista → **Export CSV**:
  - `puntualidad_por_usuario` → % de entregas fuera de plazo por alumno y grupo (VD1).
  - `surveys` → puntajes SUS (0-100, ya calculados) y TAM (promedio 1-5).
  - `events` → bitácora automatizada: `session`, `chat_query`, `push_sent`, `task_done`, `syllabus_upload`.
- **Métricas RAG (H1b)**: arma 30-50 preguntas con respuesta conocida (fechas reales de tareas, datos del syllabus), pregúntalas al asistente y marca correcto/incorrecto/alucinación; precisión = correctas/total. Eso se hace a mano.

## Solución de problemas
| Síntoma | Causa / solución |
|---|---|
| "Sesión inválida" | Revisa que `SUPABASE_URL` y `SERVICE_ROLE_KEY` del backend sean del mismo proyecto que el frontend. |
| Error CORS en el navegador | `FRONTEND_URL` en Render debe ser EXACTAMENTE la URL del frontend (sin `/` final). |
| Gemini 404 / 429 | 404: cambia el nombre del modelo en variables. 429: límite gratuito por minuto; espera. |
| Syllabus "sin texto legible" | El PDF es un escaneo; usa uno con texto seleccionable. |
| Push no llega | Permiso de notificaciones bloqueado en el navegador; `FIREBASE_SERVICE_ACCOUNT` mal pegado (JSON inválido); en iOS falta instalar la app. |
| Cron responde 401 | El header `x-cron-secret` no coincide con `CRON_SECRET`. |
