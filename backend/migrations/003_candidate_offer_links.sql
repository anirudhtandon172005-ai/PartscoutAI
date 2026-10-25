-- Link persisted supplier offers to the search candidate that produced them.
alter table public.supplier_offers
  add column if not exists candidate_id text references public.search_candidates(id) on delete cascade;
create index if not exists idx_offers_candidate on public.supplier_offers(candidate_id);
