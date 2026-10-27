insert into public.llm_providers (name, base_url, active)
select 'Google Gemini', 'https://generativelanguage.googleapis.com/v1beta/openai/', true
where not exists (
  select 1 from public.llm_providers where name = 'Google Gemini'
);

insert into public.llm_models (provider_id, name, model_key, active)
select providers.id, 'Gemini 2.5 Flash', 'gemini-2.5-flash', true
from public.llm_providers providers
where providers.name = 'Google Gemini'
  and not exists (
    select 1 from public.llm_models models
    where models.model_key = 'gemini-2.5-flash'
  );
