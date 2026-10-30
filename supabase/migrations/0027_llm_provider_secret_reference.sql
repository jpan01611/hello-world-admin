alter table public.llm_providers
  add column if not exists secret_env_var text;

update public.llm_providers
set secret_env_var = case
  when lower(name) like '%gemini%' then 'GEMINI_API_KEY'
  when lower(name) like '%openai%' then 'OPENAI_API_KEY'
  else secret_env_var
end
where secret_env_var is null;
