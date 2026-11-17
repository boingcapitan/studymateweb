-- =====================================================
-- StudyMateWeb - Esquema de base de datos (Supabase)
-- Ejecutar completo en: Supabase > SQL Editor > New query
-- =====================================================
create extension if not exists vector;

-- Perfiles (1 por usuario de auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  group_type text not null default 'experimental' check (group_type in ('experimental','control')),
  ical_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Crear perfil automáticamente al registrarse
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Horario semanal (day_of_week: 1=lunes ... 7=domingo)
create table if not exists schedule_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  day_of_week int not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  room text,
  created_at timestamptz not null default now()
);

-- Tareas
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text,
  description text,
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','done')),
  completed_at timestamptz,
  reminded_24h boolean not null default false,
  reminded_2h boolean not null default false,
  source text not null default 'manual' check (source in ('manual','syllabus')),
  created_at timestamptz not null default now()
);
create index if not exists tasks_user_due on tasks(user_id, due_at);

-- Documentos (syllabus) y fragmentos vectorizados para RAG
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  created_at timestamptz not null default now()
);
create table if not exists chunks (
  id bigserial primary key,
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  embedding vector(768)
);
create index if not exists chunks_user on chunks(user_id);

-- Tokens de notificaciones push (FCM)
create table if not exists push_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Bitácora automatizada (sesiones, chatbot, alertas)
create table if not exists events (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Encuestas SUS / TAM
create table if not exists surveys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('SUS','TAM')),
  answers jsonb not null,
  score numeric,
  created_at timestamptz not null default now()
);

-- Búsqueda por similitud (solo fragmentos del usuario)
create or replace function match_chunks(query_embedding vector(768), p_user uuid, match_count int default 5)
returns table (id bigint, content text, similarity float)
language sql stable as $$
  select c.id, c.content, 1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  where c.user_id = p_user
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Seguridad: RLS activado SIN políticas => la clave anon no puede leer nada.
-- Solo el backend (service_role) accede a los datos.
alter table profiles enable row level security;
alter table schedule_entries enable row level security;
alter table tasks enable row level security;
alter table documents enable row level security;
alter table chunks enable row level security;
alter table push_tokens enable row level security;
alter table events enable row level security;
alter table surveys enable row level security;

-- Vista útil para análisis de puntualidad (exportar a SPSS/R)
create or replace view puntualidad_por_usuario as
select p.id as user_id, p.full_name, p.group_type,
  count(t.*) filter (where t.status='done') as entregadas,
  count(t.*) filter (where t.status='done' and t.completed_at > t.due_at) as tardias,
  count(t.*) filter (where t.status='pending' and t.due_at < now()) as vencidas_sin_entregar,
  round(100.0 * count(t.*) filter (where (t.status='done' and t.completed_at > t.due_at) or (t.status='pending' and t.due_at < now()))
        / nullif(count(t.*) filter (where t.status='done' or t.due_at < now()),0), 1) as pct_fuera_de_plazo
from profiles p left join tasks t on t.user_id = p.id
group by p.id, p.full_name, p.group_type;
