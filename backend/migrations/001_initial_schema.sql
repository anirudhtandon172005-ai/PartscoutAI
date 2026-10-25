-- PartScout initial Supabase schema.
-- Apply with the Supabase SQL editor or a migration runner.
-- Version: 1.0.0

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ============================================================================
-- Helper Functions
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ============================================================================
-- Core Identity & Workspace Tables
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  facility text not null default '',
  role text not null default 'engineer' check (role in ('engineer', 'procurement', 'admin')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  facility text not null default '',
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'engineer', 'procurement', 'viewer')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (workspace_id, user_id)
);

-- ============================================================================
-- Machine & Part Catalog Tables
-- ============================================================================

create table if not exists public.machines (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  manufacturer text not null,
  model text not null,
  machine_type text not null default '',
  facility text not null default '',
  production_line text not null default '',
  commission_year integer,
  criticality text not null default 'Medium' check (criticality in ('High', 'Medium', 'Low')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.parts (
  id text primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  part_number text not null,
  manufacturer text not null,
  name text not null,
  category text not null default '',
  description text not null default '',
  image_url text,
  datasheet_url text,
  specifications jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, part_number, manufacturer)
);

-- ============================================================================
-- Part Request & Tracking Tables
-- ============================================================================

create table if not exists public.part_requests (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  machine_id text references public.machines(id) on delete set null,
  request_number text not null,
  machine_name text not null,
  part_name text not null,
  original_part_number text not null,
  manufacturer text not null default '',
  quantity_needed integer not null check (quantity_needed > 0),
  urgency text not null check (urgency in ('Line Down (Critical)', 'Urgent (24-48h)', 'Planned Maintenance', 'Standard Restock')),
  acceptable_alternatives boolean not null default true,
  custom_requirements text not null default '',
  status text not null default 'Draft' check (status in ('Draft', 'Researching', 'Candidates Found', 'Quote Requested', 'Approved', 'PO Issued', 'Installed')),
  target_component_id text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, request_number)
);

create table if not exists public.request_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  request_id text not null references public.part_requests(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  author_name text not null default '',
  text text not null check (length(trim(text)) > 0),
  created_at timestamptz not null default timezone('utc', now())
);

-- ============================================================================
-- Search Pipeline Tables (Backend-owned writes)
-- ============================================================================

create table if not exists public.searches (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  request_id text references public.part_requests(id) on delete set null,
  machine_name text not null,
  part_name text not null,
  original_part_number text not null,
  manufacturer text,
  quantity integer not null check (quantity > 0),
  requirements jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  stage text check (stage is null or stage in ('source_discovery', 'page_retrieval', 'attribute_extraction', 'normalization', 'validation', 'evidence_compilation')),
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  stage_message text not null default '',
  error text,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create table if not exists public.search_candidates (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  search_id text not null references public.searches(id) on delete cascade,
  part_id text references public.parts(id) on delete set null,
  part_number text not null,
  manufacturer text not null,
  compatibility text not null check (compatibility in ('compatible', 'partial', 'incompatible', 'unknown')),
  score integer not null check (score between 0 and 100),
  specifications jsonb not null default '{}'::jsonb,
  offers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.candidate_evidence (
  id bigint generated by default as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  candidate_id text not null references public.search_candidates(id) on delete cascade,
  field text not null,
  quote text not null,
  source_url text not null,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  retrieved_at timestamptz,
  verified_by_human boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

-- ============================================================================
-- User Workspace Data Tables
-- ============================================================================

create table if not exists public.saved_parts (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  part_id text not null references public.parts(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (workspace_id, user_id, part_id)
);

-- ============================================================================
-- Supplier & Quotation Tables
-- ============================================================================

create table if not exists public.suppliers (
  id text primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  domain text not null default '',
  type text not null default 'Specialist Stockist',
  country text not null default '',
  headquarters text not null default '',
  inventory_reliability_score numeric(5,2) check (inventory_reliability_score between 0 and 100),
  average_fulfillment_days integer,
  active_listings_count integer not null default 0,
  verified_partner boolean not null default false,
  contact_disclaimer text not null default '',
  direct_phone text,
  support_email text,
  website_url text not null default '',
  description text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.supplier_offers (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  supplier_id text not null references public.suppliers(id) on delete cascade,
  candidate_id text references public.search_candidates(id) on delete cascade,
  part_id text references public.parts(id) on delete set null,
  part_number text not null,
  supplier_name text not null,
  supplier_domain text not null default '',
  supplier_type text not null default 'Specialist Stockist',
  location text not null default '',
  reported_price numeric(14,2) not null check (reported_price >= 0),
  currency text not null default 'USD',
  stock_status text not null,
  quantity_available integer check (quantity_available is null or quantity_available >= 0),
  lead_time_days integer not null default 0 check (lead_time_days >= 0),
  min_order_quantity integer not null default 1 check (min_order_quantity > 0),
  source_url text not null default '',
  last_checked timestamptz,
  freshness text not null default 'stale' check (freshness in ('fresh', 'moderate', 'stale')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.quotations (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  part_request_id text not null references public.part_requests(id) on delete cascade,
  supplier_id text references public.suppliers(id) on delete set null,
  part_number text not null,
  supplier_name text not null,
  unit_price numeric(14,2) not null check (unit_price >= 0),
  currency text not null default 'USD',
  quantity integer not null check (quantity > 0),
  total_price numeric(14,2) not null check (total_price >= 0),
  lead_time_weeks integer not null default 0 check (lead_time_weeks >= 0),
  rfq_number text not null,
  quoted_at timestamptz not null default timezone('utc', now()),
  valid_until timestamptz,
  terms text not null default '',
  is_official boolean not null default false,
  status text not null default 'Pending Review' check (status in ('Pending Review', 'Accepted', 'Declined')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ============================================================================
-- Data Collection & Quality Tables
-- ============================================================================

create table if not exists public.source_domains (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  domain text not null,
  category text not null,
  enabled boolean not null default true,
  crawl_frequency text not null default 'Daily',
  last_crawl_status text not null default 'Warning',
  last_crawl_time timestamptz,
  extracted_products_count integer not null default 0 check (extracted_products_count >= 0),
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.collection_jobs (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  job_name text not null,
  domain text not null,
  status text not null check (status in ('Completed', 'Running', 'Failed', 'Queued')),
  records_extracted integer not null default 0 check (records_extracted >= 0),
  duration_seconds numeric(12,2) not null default 0 check (duration_seconds >= 0),
  retries integer not null default 0 check (retries >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.data_quality_issues (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  issue_type text not null,
  severity text not null check (severity in ('High', 'Medium', 'Low')),
  part_number text not null,
  description text not null,
  sources jsonb not null default '[]'::jsonb,
  detected_at timestamptz not null default timezone('utc', now()),
  resolved boolean not null default false,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

create index if not exists idx_workspace_members_user on public.workspace_members(user_id);
create index if not exists idx_machines_workspace on public.machines(workspace_id);
create index if not exists idx_parts_workspace on public.parts(workspace_id);
create index if not exists idx_requests_workspace_status on public.part_requests(workspace_id, status);
create index if not exists idx_requests_created_by on public.part_requests(created_by);
create index if not exists idx_searches_workspace_status on public.searches(workspace_id, status);
create index if not exists idx_searches_created_by on public.searches(created_by);
create index if not exists idx_candidates_search_score on public.search_candidates(search_id, score desc);
create index if not exists idx_evidence_candidate on public.candidate_evidence(candidate_id);
create index if not exists idx_quotes_workspace_status on public.quotations(workspace_id, status);
create index if not exists idx_jobs_workspace_status on public.collection_jobs(workspace_id, status);
create index if not exists idx_quality_workspace_resolved on public.data_quality_issues(workspace_id, resolved);
create index if not exists idx_offers_workspace_part on public.supplier_offers(workspace_id, part_id);
create index if not exists idx_offers_supplier on public.supplier_offers(supplier_id);
create index if not exists idx_offers_candidate on public.supplier_offers(candidate_id);

-- ============================================================================
-- Updated At Triggers
-- ============================================================================

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists workspaces_updated_at on public.workspaces;
create trigger workspaces_updated_at before update on public.workspaces for each row execute function public.set_updated_at();

drop trigger if exists machines_updated_at on public.machines;
create trigger machines_updated_at before update on public.machines for each row execute function public.set_updated_at();

drop trigger if exists parts_updated_at on public.parts;
create trigger parts_updated_at before update on public.parts for each row execute function public.set_updated_at();

drop trigger if exists requests_updated_at on public.part_requests;
create trigger requests_updated_at before update on public.part_requests for each row execute function public.set_updated_at();

drop trigger if exists suppliers_updated_at on public.suppliers;
create trigger suppliers_updated_at before update on public.suppliers for each row execute function public.set_updated_at();

drop trigger if exists offers_updated_at on public.supplier_offers;
create trigger offers_updated_at before update on public.supplier_offers for each row execute function public.set_updated_at();

drop trigger if exists quotations_updated_at on public.quotations;
create trigger quotations_updated_at before update on public.quotations for each row execute function public.set_updated_at();

drop trigger if exists source_domains_updated_at on public.source_domains;
create trigger source_domains_updated_at before update on public.source_domains for each row execute function public.set_updated_at();

-- ============================================================================
-- Security Helper Functions
-- ============================================================================

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.has_workspace_role(target_workspace uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = auth.uid()
      and wm.role = any(allowed_roles)
  );
$$;

-- ============================================================================
-- New User Onboarding Trigger
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
  display_name text;
  facility_name text;
begin
  display_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  facility_name := coalesce(new.raw_user_meta_data ->> 'facility', '');
  insert into public.profiles (id, email, full_name, facility)
  values (new.id, coalesce(new.email, ''), display_name, facility_name)
  on conflict (id) do update set email = excluded.email;

  insert into public.workspaces (name, facility, owner_id)
  values (
    case when facility_name = '' then 'PartScout Workspace' else facility_name end,
    facility_name,
    new.id
  )
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Enable RLS on all application tables
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.machines enable row level security;
alter table public.parts enable row level security;
alter table public.part_requests enable row level security;
alter table public.request_notes enable row level security;
alter table public.searches enable row level security;
alter table public.search_candidates enable row level security;
alter table public.candidate_evidence enable row level security;
alter table public.saved_parts enable row level security;
alter table public.suppliers enable row level security;
alter table public.supplier_offers enable row level security;
alter table public.quotations enable row level security;
alter table public.source_domains enable row level security;
alter table public.collection_jobs enable row level security;
alter table public.data_quality_issues enable row level security;

-- Profiles: users can read/update their own profile
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select using (id = auth.uid());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Workspaces: members can read, owners can update
drop policy if exists workspaces_member_select on public.workspaces;
create policy workspaces_member_select on public.workspaces for select using (public.is_workspace_member(id));

drop policy if exists workspaces_owner_update on public.workspaces;
create policy workspaces_owner_update on public.workspaces for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Workspace Members: members can read, admins/owners can manage
drop policy if exists workspace_members_member_select on public.workspace_members;
create policy workspace_members_member_select on public.workspace_members for select using (public.is_workspace_member(workspace_id));

drop policy if exists workspace_members_admin_manage on public.workspace_members;
create policy workspace_members_admin_manage on public.workspace_members for all using (public.has_workspace_role(workspace_id, array['owner', 'admin'])) with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

-- Machines: members can read, admins/owners can manage
drop policy if exists machines_member_select on public.machines;
create policy machines_member_select on public.machines for select using (public.is_workspace_member(workspace_id));

drop policy if exists machines_admin_manage on public.machines;
create policy machines_admin_manage on public.machines for all using (public.has_workspace_role(workspace_id, array['owner', 'admin'])) with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

-- Parts: members can read (including global parts with null workspace), admins/owners can manage workspace parts
drop policy if exists parts_member_select on public.parts;
create policy parts_member_select on public.parts for select using (workspace_id is null or public.is_workspace_member(workspace_id));

drop policy if exists parts_admin_manage on public.parts;
create policy parts_admin_manage on public.parts for all using (workspace_id is not null and public.has_workspace_role(workspace_id, array['owner', 'admin'])) with check (workspace_id is not null and public.has_workspace_role(workspace_id, array['owner', 'admin']));

-- Part Requests: members can read, members can create (as themselves), engineers/procurement/admins can update
drop policy if exists requests_member_select on public.part_requests;
create policy requests_member_select on public.part_requests for select using (public.is_workspace_member(workspace_id));

drop policy if exists requests_member_insert on public.part_requests;
create policy requests_member_insert on public.part_requests for insert with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

drop policy if exists requests_member_update on public.part_requests;
create policy requests_member_update on public.part_requests for update using (public.is_workspace_member(workspace_id) and (created_by = auth.uid() or public.has_workspace_role(workspace_id, array['owner', 'admin', 'procurement']))) with check (public.is_workspace_member(workspace_id));

-- Request Notes: members can read, members can create (as themselves)
drop policy if exists notes_member_access on public.request_notes;
create policy notes_member_access on public.request_notes for select using (public.is_workspace_member(workspace_id));

drop policy if exists notes_member_insert on public.request_notes;
create policy notes_member_insert on public.request_notes for insert with check (public.is_workspace_member(workspace_id) and author_id = auth.uid());

-- Searches: members can read (no browser write policies - backend-owned)
drop policy if exists searches_member_select on public.searches;
create policy searches_member_select on public.searches for select using (public.is_workspace_member(workspace_id));
-- No browser insert/update/delete policies: search writes are backend-owned via service role

-- Search Candidates: members can read (no browser write policies)
drop policy if exists candidates_member_select on public.search_candidates;
create policy candidates_member_select on public.search_candidates for select using (public.is_workspace_member(workspace_id));

-- Candidate Evidence: members can read (no browser write policies)
drop policy if exists evidence_member_select on public.candidate_evidence;
create policy evidence_member_select on public.candidate_evidence for select using (public.is_workspace_member(workspace_id));

-- Saved Parts: users can manage their own saved parts within workspace
drop policy if exists saved_parts_member_access on public.saved_parts;
create policy saved_parts_member_access on public.saved_parts for all using (public.is_workspace_member(workspace_id) and user_id = auth.uid()) with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());

-- Suppliers: members can read (including global suppliers), admins/owners can manage workspace suppliers
drop policy if exists suppliers_member_select on public.suppliers;
create policy suppliers_member_select on public.suppliers for select using (workspace_id is null or public.is_workspace_member(workspace_id));

drop policy if exists suppliers_admin_manage on public.suppliers;
create policy suppliers_admin_manage on public.suppliers for all using (workspace_id is not null and public.has_workspace_role(workspace_id, array['owner', 'admin'])) with check (workspace_id is not null and public.has_workspace_role(workspace_id, array['owner', 'admin']));

-- Supplier Offers: members can read, admins/owners can manage
drop policy if exists offers_member_select on public.supplier_offers;
create policy offers_member_select on public.supplier_offers for select using (public.is_workspace_member(workspace_id));

drop policy if exists offers_admin_manage on public.supplier_offers;
create policy offers_admin_manage on public.supplier_offers for all using (public.has_workspace_role(workspace_id, array['owner', 'admin'])) with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

-- Quotations: members can read, members can create (as themselves), engineers/procurement/admins can update
drop policy if exists quotations_member_select on public.quotations;
create policy quotations_member_select on public.quotations for select using (public.is_workspace_member(workspace_id));

drop policy if exists quotations_member_insert on public.quotations;
create policy quotations_member_insert on public.quotations for insert with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

drop policy if exists quotations_member_update on public.quotations;
create policy quotations_member_update on public.quotations for update using (public.is_workspace_member(workspace_id) and (created_by = auth.uid() or public.has_workspace_role(workspace_id, array['owner', 'admin', 'procurement']))) with check (public.is_workspace_member(workspace_id));

-- Source Domains & Collection Jobs: admin/owner only
drop policy if exists jobs_admin_access on public.collection_jobs;
create policy jobs_admin_access on public.collection_jobs for all using (public.has_workspace_role(workspace_id, array['owner', 'admin'])) with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

drop policy if exists domains_admin_access on public.source_domains;
create policy domains_admin_access on public.source_domains for all using (public.has_workspace_role(workspace_id, array['owner', 'admin'])) with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

-- Data Quality Issues: members can read, admins/owners can manage
drop policy if exists quality_member_select on public.data_quality_issues;
create policy quality_member_select on public.data_quality_issues for select using (public.is_workspace_member(workspace_id));

drop policy if exists quality_admin_manage on public.data_quality_issues;
create policy quality_admin_manage on public.data_quality_issues for all using (public.has_workspace_role(workspace_id, array['owner', 'admin'])) with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

-- ============================================================================
-- Force Row Level Security (prevents superuser bypass in some contexts)
-- ============================================================================

alter table public.profiles force row level security;
alter table public.workspaces force row level security;
alter table public.workspace_members force row level security;
alter table public.machines force row level security;
alter table public.parts force row level security;
alter table public.part_requests force row level security;
alter table public.request_notes force row level security;
alter table public.searches force row level security;
alter table public.search_candidates force row level security;
alter table public.candidate_evidence force row level security;
alter table public.saved_parts force row level security;
alter table public.suppliers force row level security;
alter table public.supplier_offers force row level security;
alter table public.quotations force row level security;
alter table public.source_domains force row level security;
alter table public.collection_jobs force row level security;
alter table public.data_quality_issues force row level security;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

comment on table public.profiles is 'User profile linked to auth.users';
comment on table public.workspaces is 'Plant/team workspace metadata';
comment on table public.workspace_members is 'User-to-workspace membership with roles';
comment on table public.machines is 'Manufacturing equipment registry';
comment on table public.parts is 'Part catalog with flexible JSONB specifications';
comment on table public.part_requests is 'Part replacement requests with workflow status';
comment on table public.request_notes is 'Request timeline and collaboration notes';
comment on table public.searches is 'Backend-owned search pipeline execution records';
comment on table public.search_candidates is 'Candidate parts discovered during search';
comment on table public.candidate_evidence is 'Evidence citations for candidate compatibility';
comment on table public.saved_parts is 'User workspace saved-part relationships';
comment on table public.suppliers is 'Supplier directory with verification metadata';
comment on table public.supplier_offers is 'Supplier-specific part offers with pricing and stock';
comment on table public.quotations is 'Formal RFQ quotations linked to requests';
comment on table public.source_domains is 'Workspace crawler target registry';
comment on table public.collection_jobs is 'Crawl job execution history';
comment on table public.data_quality_issues is 'Data quality flags for parts and offers';
