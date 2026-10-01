-- Run this whole file in the Supabase SQL Editor. It is safe to run more than once.

create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  url text not null,
  status text not null default 'queued'
    check (status in ('queued','running','done','error')),
  stage text,
  report jsonb,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists simulations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  analysis_id uuid not null references analyses(id) on delete cascade,
  scenario text not null,
  status text not null default 'queued'
    check (status in ('queued','running','done','error')),
  result jsonb,
  error text,
  created_at timestamptz not null default now()
);

-- Safe migration for databases created before ownership was added. Existing rows
-- remain inaccessible to authenticated clients because their owner_id is null.
alter table analyses add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table simulations add column if not exists owner_id uuid references auth.users(id) on delete cascade;

create index if not exists analyses_queue_idx on analyses (status, created_at);
create index if not exists analyses_owner_idx on analyses (owner_id);
create index if not exists simulations_queue_idx on simulations (status, created_at);
create index if not exists simulations_analysis_idx on simulations (analysis_id);
create index if not exists simulations_owner_idx on simulations (owner_id);

-- Only one active run per scenario per analysis (stops button spam)
create unique index if not exists simulations_one_active_idx
  on simulations (analysis_id, scenario) where status in ('queued','running');

alter table analyses enable row level security;
alter table simulations enable row level security;

-- Each browser gets an authenticated Supabase user (anonymous auth is sufficient for
-- the current UX). The worker uses the service role key, which bypasses these rules.
drop policy if exists "create analysis job" on analyses;
create policy "create analysis job" on analyses
  for insert to authenticated with check (
    owner_id = auth.uid() and
    status = 'queued' and report is null and stage is null and error is null
  );

drop policy if exists "read analyses" on analyses;
create policy "read analyses" on analyses for select to authenticated using (owner_id = auth.uid());

drop policy if exists "create simulation job" on simulations;
create policy "create simulation job" on simulations
  for insert to authenticated with check (
    owner_id = auth.uid() and
    status = 'queued' and result is null and error is null and
    exists (select 1 from analyses a where a.id = analysis_id and a.owner_id = auth.uid())
  );

drop policy if exists "read simulations" on simulations;
create policy "read simulations" on simulations for select to authenticated using (owner_id = auth.uid());

-- Live updates in the browser
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'analyses') then
    alter publication supabase_realtime add table analyses;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'simulations') then
    alter publication supabase_realtime add table simulations;
  end if;
end $$;

-- Lets a worker claim exactly one queued job, even with several workers running
create or replace function claim_analysis()
returns setof analyses language plpgsql as $$
declare r analyses;
begin
  select * into r from analyses
    where status = 'queued'
    order by created_at limit 1
    for update skip locked;
  if not found then return; end if;
  update analyses set status = 'running', stage = 'launching'
    where id = r.id returning * into r;
  return next r;
end $$;

create or replace function claim_simulation()
returns setof simulations language plpgsql as $$
declare r simulations;
begin
  select * into r from simulations
    where status = 'queued'
    order by created_at limit 1
    for update skip locked;
  if not found then return; end if;
  update simulations set status = 'running'
    where id = r.id returning * into r;
  return next r;
end $$;
