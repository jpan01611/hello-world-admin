create table if not exists public.llm_generation_steps (
  id uuid primary key default gen_random_uuid(),
  step_key text not null unique,
  display_name text not null,
  prompt_template text not null,
  max_tokens integer not null check (max_tokens between 1 and 4000),
  max_output_chars integer not null check (max_output_chars between 1 and 10000),
  temperature numeric check (temperature is null or temperature between 0 and 2),
  thinking_budget integer check (thinking_budget is null or thinking_budget between 0 and 32768),
  model_id uuid references public.llm_models(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.llm_generation_steps
  (step_key, display_name, prompt_template, max_tokens, max_output_chars, thinking_budget)
values
  ('vision_analysis', 'Vision analysis',
   'Analyze only {image} before considering outside context. Identify the visible subject, action, setting, composition, mood, and notable visual details in 2-3 factual sentences. Do not write a caption, add a joke, infer hidden details, or mention NYC or Columbia University yet.',
   220, 1200, null),
  ('caption_generation', 'Caption generation',
   'Photo analysis: "{description}"\n\nCreator context: "{context}"\n\nUse these inputs privately. Write one brief, witty meme statement grounded in the visible photo. Use context when useful, prefer natural Columbia student-life references when supported, never force unsupported references, and return exactly one sentence of no more than twelve words.',
   120, 500, 0)
on conflict (step_key) do nothing;

alter table public.llm_generation_steps enable row level security;
create policy "Authenticated users can read llm generation steps" on public.llm_generation_steps for select to authenticated using (true);
create policy "Superadmins can manage llm generation steps" on public.llm_generation_steps for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());
