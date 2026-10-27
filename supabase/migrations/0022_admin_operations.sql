create table if not exists public.prompt_chains (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompt_chain_steps (
  id uuid primary key default gen_random_uuid(),
  chain_id uuid not null references public.prompt_chains(id) on delete cascade,
  step_order integer not null default 1,
  name text not null,
  prompt text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.prompt_chain_mix (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  chain_id uuid references public.prompt_chains(id) on delete set null,
  weight numeric not null default 1,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.terms (
  id uuid primary key default gen_random_uuid(),
  term text not null unique,
  definition text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.generation_requests (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending',
  provider text,
  model text,
  input text,
  output text,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_generation_examples (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  input text not null,
  output text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.llm_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  base_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.llm_models (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references public.llm_providers(id) on delete set null,
  name text not null,
  model_key text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.llm_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.generation_requests(id) on delete set null,
  provider text,
  model text,
  response text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.allowed_signup_domains (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.whitelisted_email_addresses (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'prompt_chains', 'prompt_chain_steps', 'prompt_chain_mix', 'terms',
    'generation_requests', 'ai_generation_examples', 'llm_providers',
    'llm_models', 'llm_responses', 'allowed_signup_domains',
    'whitelisted_email_addresses'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "Authenticated users can read %1$s" on public.%1$s', table_name);
    execute format('create policy "Authenticated users can read %1$s" on public.%1$s for select to authenticated using (true)', table_name);
    execute format('drop policy if exists "Superadmins can manage %1$s" on public.%1$s', table_name);
    execute format('create policy "Superadmins can manage %1$s" on public.%1$s for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin())', table_name);
  end loop;
end $$;
