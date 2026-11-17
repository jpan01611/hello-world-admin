update public.llm_models
set
  name = 'Gemini 3.8 Flash',
  model_key = 'gemini-3.8-flash'
where model_key = 'gemini-2.5-flash';
