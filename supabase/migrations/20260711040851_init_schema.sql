-- =====================================================================
-- Webinar Automation — Initial Schema
-- Scheduled automated webinar platform (shared timeline, server-authoritative)
-- =====================================================================

create extension if not exists vector;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- admin_profiles: links auth.users to admin role
-- ---------------------------------------------------------------------
create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- webinars
-- ---------------------------------------------------------------------
create table if not exists public.webinars (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  slug text unique not null,
  speaker text,
  video_type text not null check (video_type in ('mp4','youtube','vimeo')),
  video_url text,
  thumbnail text,
  duration_seconds int not null,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- scheduled_sessions
-- ---------------------------------------------------------------------
create table if not exists public.scheduled_sessions (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','live','ended','cancelled')),
  created_at timestamptz default now()
);
create index if not exists idx_scheduled_sessions_webinar_start
  on public.scheduled_sessions (webinar_id, start_time);

-- ---------------------------------------------------------------------
-- recurrence_rules
-- ---------------------------------------------------------------------
create table if not exists public.recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  days_of_week int[] not null,
  time_of_day time not null,
  timezone text not null default 'Asia/Kolkata',
  end_date date,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- registrations
-- ---------------------------------------------------------------------
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.scheduled_sessions(id) on delete cascade,
  webinar_id uuid not null references public.webinars(id),
  name text not null,
  email text not null,
  join_token uuid unique default gen_random_uuid(),
  joined_at timestamptz,
  purchase_status text not null default 'none' check (purchase_status in ('none','clicked','purchased')),
  created_at timestamptz default now(),
  unique (session_id, email)
);
create index if not exists idx_registrations_session
  on public.registrations (session_id);

-- ---------------------------------------------------------------------
-- offers
-- ---------------------------------------------------------------------
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  offer_time_seconds int not null,
  title text not null,
  button_text text not null,
  payment_link text not null,
  popup_title text,
  popup_description text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- ai_instructions
-- ---------------------------------------------------------------------
create table if not exists public.ai_instructions (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid unique not null references public.webinars(id) on delete cascade,
  system_prompt text not null,
  personality text,
  rules text,
  sales_copy text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- ai_knowledge (RAG source documents)
-- ---------------------------------------------------------------------
create table if not exists public.ai_knowledge (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  source_type text not null check (source_type in ('faq','pdf','notes','sales_page','transcript')),
  title text,
  content text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);
create index if not exists idx_ai_knowledge_embedding
  on public.ai_knowledge using ivfflat (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------
-- chat_messages (private per attendee)
-- ---------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz default now()
);
create index if not exists idx_chat_messages_registration
  on public.chat_messages (registration_id, created_at);

-- ---------------------------------------------------------------------
-- analytics_events
-- ---------------------------------------------------------------------
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references public.webinars(id),
  session_id uuid references public.scheduled_sessions(id),
  registration_id uuid references public.registrations(id),
  event_type text not null check (event_type in ('register','join','offer_click','purchase','complete')),
  occurred_at timestamptz default now()
);
create index if not exists idx_analytics_events_webinar_type
  on public.analytics_events (webinar_id, event_type);

-- =====================================================================
-- Vector similarity search RPC for RAG retrieval
-- =====================================================================
create or replace function public.match_ai_knowledge(
  p_webinar_id uuid,
  p_embedding vector(1536),
  p_top_k int default 5
)
returns table (
  id uuid,
  content text,
  title text,
  source_type text,
  similarity float
)
language sql
security definer
set search_path = public
as $$
  select
    k.id,
    k.content,
    k.title,
    k.source_type,
    1 - (k.embedding <=> p_embedding) as similarity
  from public.ai_knowledge k
  where k.webinar_id = p_webinar_id
    and k.embedding is not null
  order by k.embedding <=> p_embedding
  limit p_top_k;
$$;

grant execute on function public.match_ai_knowledge(uuid, vector(1536), int) to anon, authenticated, service_role;

-- =====================================================================
-- Helper: is current user an admin?
-- =====================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  exists (
    select 1 from public.admin_profiles
    where id = auth.uid()
  );
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.admin_profiles enable row level security;
alter table public.webinars enable row level security;
alter table public.scheduled_sessions enable row level security;
alter table public.recurrence_rules enable row level security;
alter table public.registrations enable row level security;
alter table public.offers enable row level security;
alter table public.ai_instructions enable row level security;
alter table public.ai_knowledge enable row level security;
alter table public.chat_messages enable row level security;
alter table public.analytics_events enable row level security;

-- admin_profiles: admins can read all; users can read own row
drop policy if exists "admin_profiles_select" on public.admin_profiles;
create policy "admin_profiles_select" on public.admin_profiles
  for select using (public.is_admin() or id = auth.uid());

drop policy if exists "admin_profiles_insert" on public.admin_profiles;
create policy "admin_profiles_insert" on public.admin_profiles
  for insert with check (id = auth.uid());

-- webinars: admins full access; public can read published
drop policy if exists "webinars_admin_all" on public.webinars;
create policy "webinars_admin_all" on public.webinars
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "webinars_public_read" on public.webinars;
create policy "webinars_public_read" on public.webinars
  for select using (status = 'published');

-- scheduled_sessions: admins full; public read for published webinar sessions
drop policy if exists "scheduled_sessions_admin_all" on public.scheduled_sessions;
create policy "scheduled_sessions_admin_all" on public.scheduled_sessions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "scheduled_sessions_public_read" on public.scheduled_sessions;
create policy "scheduled_sessions_public_read" on public.scheduled_sessions
  for select using (
    exists (
      select 1 from public.webinars w
      where w.id = scheduled_sessions.webinar_id
      and w.status = 'published'
    )
  );

-- recurrence_rules: admin only
drop policy if exists "recurrence_rules_admin_all" on public.recurrence_rules;
create policy "recurrence_rules_admin_all" on public.recurrence_rules
  for all using (public.is_admin()) with check (public.is_admin());

-- offers: admin full; public read for published webinar offers
drop policy if exists "offers_admin_all" on public.offers;
create policy "offers_admin_all" on public.offers
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "offers_public_read" on public.offers;
create policy "offers_public_read" on public.offers
  for select using (
    exists (
      select 1 from public.webinars w
      where w.id = offers.webinar_id
      and w.status = 'published'
    )
  );

-- ai_instructions: admin full; public read for published webinar
drop policy if exists "ai_instructions_admin_all" on public.ai_instructions;
create policy "ai_instructions_admin_all" on public.ai_instructions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "ai_instructions_public_read" on public.ai_instructions;
create policy "ai_instructions_public_read" on public.ai_instructions
  for select using (
    exists (
      select 1 from public.webinars w
      where w.id = ai_instructions.webinar_id
      and w.status = 'published'
    )
  );

-- ai_knowledge: admin full; service role reads for RAG
drop policy if exists "ai_knowledge_admin_all" on public.ai_knowledge;
create policy "ai_knowledge_admin_all" on public.ai_knowledge
  for all using (public.is_admin()) with check (public.is_admin());

-- registrations: attendee inserts own (by join_token), reads own; admin full
drop policy if exists "registrations_admin_all" on public.registrations;
create policy "registrations_admin_all" on public.registrations
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "registrations_public_insert" on public.registrations;
create policy "registrations_public_insert" on public.registrations
  for insert with check (true);

drop policy if exists "registrations_self_select" on public.registrations;
create policy "registrations_self_select" on public.registrations
  for select using (join_token::text = current_setting('app.join_token', true));

drop policy if exists "registrations_self_update" on public.registrations;
create policy "registrations_self_update" on public.registrations
  for update using (join_token::text = current_setting('app.join_token', true));

-- chat_messages: attendee reads/inserts own (by join_token via registration); admin full
drop policy if exists "chat_messages_admin_all" on public.chat_messages;
create policy "chat_messages_admin_all" on public.chat_messages
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "chat_messages_self_select" on public.chat_messages;
create policy "chat_messages_self_select" on public.chat_messages
  for select using (
    exists (
      select 1 from public.registrations r
      where r.id = chat_messages.registration_id
      and r.join_token::text = current_setting('app.join_token', true)
    )
  );

drop policy if exists "chat_messages_self_insert" on public.chat_messages;
create policy "chat_messages_self_insert" on public.chat_messages
  for insert with check (
    exists (
      select 1 from public.registrations r
      where r.id = chat_messages.registration_id
      and r.join_token::text = current_setting('app.join_token', true)
    )
  );

-- analytics_events: service role inserts; admin selects
drop policy if exists "analytics_events_admin_select" on public.analytics_events;
create policy "analytics_events_admin_select" on public.analytics_events
  for select using (public.is_admin());

drop policy if exists "analytics_events_service_insert" on public.analytics_events;
create policy "analytics_events_service_insert" on public.analytics_events
  for insert with check (true);

-- =====================================================================
-- updated_at trigger for webinars
-- =====================================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_webinars_updated_at on public.webinars;
create trigger trg_webinars_updated_at
  before update on public.webinars
  for each row execute function public.handle_updated_at();

-- =====================================================================
-- Storage bucket for MP4 uploads and knowledge docs
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('webinar-media', 'webinar-media', true)
on conflict (id) do nothing;

-- Storage policies: admin full, public read
drop policy if exists "storage_admin_all" on storage.objects;
create policy "storage_admin_all" on storage.objects
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "storage_public_read" on storage.objects;
create policy "storage_public_read" on storage.objects
  for select using (bucket_id = 'webinar-media');
