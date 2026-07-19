-- Phase 2 — Knowledge base: resume documents, ingestion chunks, work
-- experiences, projects, plus profile skills/certifications.
-- Depends on 0001 (public.set_updated_at, public.user_profiles).

-- pgvector for embeddings / semantic retrieval.
create extension if not exists vector with schema extensions;

-- Embedding dimension. 1536 matches OpenAI text-embedding-3-small and is a
-- common default. If you switch embedding models, change this and re-ingest.
-- (Kept as a literal below because Postgres type modifiers can't use variables.)

-- ---------------------------------------------------------------------------
-- documents: one row per uploaded/added source (resume, notes, etc.)
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null,
  source_type  text not null default 'resume'
                 check (source_type in ('resume', 'notes', 'other')),
  mime_type    text,
  storage_path text,                       -- documents/{user_id}/{uuid}.{ext}
  status       text not null default 'pending'
                 check (status in ('pending', 'processing', 'ready', 'failed')),
  error        text,
  char_count   integer not null default 0,
  chunk_count  integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists documents_user_idx on public.documents (user_id);

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- document_chunks: searchable pieces of a document, with embeddings.
-- ---------------------------------------------------------------------------
create table if not exists public.document_chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  chunk_index integer not null,
  content     text not null,
  token_count integer,
  embedding   extensions.vector(1536),     -- null until embeddings are generated
  created_at  timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index if not exists document_chunks_user_idx
  on public.document_chunks (user_id);
create index if not exists document_chunks_document_idx
  on public.document_chunks (document_id);

-- Approximate nearest-neighbour index for cosine similarity search.
create index if not exists document_chunks_embedding_idx
  on public.document_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- work_experiences
-- ---------------------------------------------------------------------------
create table if not exists public.work_experiences (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  company      text not null,
  title        text not null,
  location     text,
  start_date   text,                        -- free-form (e.g. "2022-01"); kept as text for MVP
  end_date     text,
  is_current   boolean not null default false,
  description  text,
  highlights   text[] not null default '{}',-- accomplishments
  skills       text[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists work_experiences_user_idx
  on public.work_experiences (user_id);

drop trigger if exists work_experiences_set_updated_at on public.work_experiences;
create trigger work_experiences_set_updated_at
  before update on public.work_experiences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  role         text,
  description  text,
  highlights   text[] not null default '{}',
  skills       text[] not null default '{}',
  link         text,
  start_date   text,
  end_date     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists projects_user_idx on public.projects (user_id);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- profile extras: skills + certifications live on the existing profile row.
-- ---------------------------------------------------------------------------
alter table public.user_profiles
  add column if not exists skills text[] not null default '{}';
alter table public.user_profiles
  add column if not exists certifications text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- Row-level security: owner-only on every user-owned table.
-- ---------------------------------------------------------------------------
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.work_experiences enable row level security;
alter table public.projects enable row level security;

-- helper to (re)create the four standard owner policies for a table
do $$
declare
  t text;
begin
  foreach t in array array['documents', 'document_chunks', 'work_experiences', 'projects']
  loop
    execute format('drop policy if exists "%s: select own" on public.%I', t, t);
    execute format(
      'create policy "%s: select own" on public.%I for select using (auth.uid() = user_id)',
      t, t);

    execute format('drop policy if exists "%s: insert own" on public.%I', t, t);
    execute format(
      'create policy "%s: insert own" on public.%I for insert with check (auth.uid() = user_id)',
      t, t);

    execute format('drop policy if exists "%s: update own" on public.%I', t, t);
    execute format(
      'create policy "%s: update own" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t, t);

    execute format('drop policy if exists "%s: delete own" on public.%I', t, t);
    execute format(
      'create policy "%s: delete own" on public.%I for delete using (auth.uid() = user_id)',
      t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- User-scoped retrieval function for semantic search over the user's chunks.
-- SECURITY INVOKER so RLS applies; also filters to auth.uid() defensively.
-- ---------------------------------------------------------------------------
create or replace function public.match_document_chunks(
  query_embedding extensions.vector(1536),
  match_count int default 6
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  chunk_index int,
  similarity float
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    dc.id,
    dc.document_id,
    dc.content,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where dc.user_id = auth.uid()
    and dc.embedding is not null
  order by dc.embedding <=> query_embedding
  limit greatest(1, least(match_count, 50));
$$;

-- ---------------------------------------------------------------------------
-- Private Storage bucket for resume uploads + owner-only object policies.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents storage: read own" on storage.objects;
create policy "documents storage: read own"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents storage: insert own" on storage.objects;
create policy "documents storage: insert own"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents storage: update own" on storage.objects;
create policy "documents storage: update own"
  on storage.objects for update
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents storage: delete own" on storage.objects;
create policy "documents storage: delete own"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
