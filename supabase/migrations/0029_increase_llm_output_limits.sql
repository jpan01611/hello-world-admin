update public.llm_generation_steps
set
  max_tokens = case step_key
    when 'vision_analysis' then 600
    when 'caption_generation' then 240
    else max_tokens
  end,
  updated_at = now()
where step_key in ('vision_analysis', 'caption_generation');
