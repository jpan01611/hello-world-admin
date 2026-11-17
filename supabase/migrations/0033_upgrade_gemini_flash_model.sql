update public.llm_models
set
  name = 'Gemini 3.5 Flash-Lite',
  model_key = 'gemini-3.5-flash-lite',
  active = true,
  updated_at = now()
where model_key in ('gemini-2.5-flash', 'gemini-3.8-flash')
  and provider_id = (select id from public.llm_providers where name = 'Google Gemini');

update public.llm_providers
set active = true,
    base_url = 'https://generativelanguage.googleapis.com/v1beta/openai/',
    secret_env_var = 'GEMINI_API_KEY',
    updated_at = now()
where name = 'Google Gemini';

update public.llm_generation_steps
set model_id = (
        select id
        from public.llm_models
        where model_key = 'gemini-3.5-flash-lite'
          and provider_id = (select id from public.llm_providers where name = 'Google Gemini')
    ),
    updated_at = now()
where step_key in ('vision_analysis', 'caption_generation');
