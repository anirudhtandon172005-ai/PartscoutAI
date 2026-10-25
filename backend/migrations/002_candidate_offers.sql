-- Search candidates can carry source-backed procurement listings.
alter table public.search_candidates
  add column if not exists offers jsonb not null default '[]'::jsonb;
