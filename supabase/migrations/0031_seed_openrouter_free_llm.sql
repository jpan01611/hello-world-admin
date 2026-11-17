insert into public.llm_providers (name, base_url, active, secret_env_var)
values ('OpenRouter', 'https://openrouter.ai/api/v1', true, 'OPENROUTER_API_KEY')
on conflict (name) do update
set base_url = excluded.base_url,
    secret_env_var = excluded.secret_env_var;

insert into public.llm_models (provider_id, name, model_key, active)
select providers.id, 'Gemma 4 31B (OpenRouter free)', 'google/gemma-4-31b-it:free', true
from public.llm_providers providers
where providers.name = 'OpenRouter'
  and not exists (
    select 1
    from public.llm_models models
    where models.model_key = 'google/gemma-4-31b-it:free'
  );

update public.llm_models
set active = true,
    provider_id = (select id from public.llm_providers where name = 'OpenRouter')
where model_key = 'google/gemma-4-31b-it:free';

update public.llm_generation_steps
set model_id = (
        select id
        from public.llm_models
        where model_key = 'google/gemma-4-31b-it:free'
    ),
    updated_at = now()
where step_key in ('vision_analysis', 'caption_generation');
