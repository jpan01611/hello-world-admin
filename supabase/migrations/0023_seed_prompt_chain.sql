insert into public.prompt_chains (name, description, active)
select 'Caption generation', 'Default prompt chain for generating image descriptions and captions.', true
where not exists (
  select 1 from public.prompt_chains where name = 'Caption generation'
);

insert into public.prompt_chain_steps (chain_id, step_order, name, prompt)
select chains.id, 1, 'Describe image', 'Describe the image accurately, including its subjects, setting, and notable visual details.'
from public.prompt_chains chains
where chains.name = 'Caption generation'
  and not exists (
    select 1 from public.prompt_chain_steps steps
    where steps.chain_id = chains.id and steps.step_order = 1
  );

insert into public.prompt_chain_steps (chain_id, step_order, name, prompt)
select chains.id, 2, 'Write caption', 'Write a concise, funny caption based on the image description.'
from public.prompt_chains chains
where chains.name = 'Caption generation'
  and not exists (
    select 1 from public.prompt_chain_steps steps
    where steps.chain_id = chains.id and steps.step_order = 2
  );

insert into public.prompt_chain_mix (name, chain_id, weight, active)
select 'Default caption mix', chains.id, 1, true
from public.prompt_chains chains
where chains.name = 'Caption generation'
  and not exists (
    select 1 from public.prompt_chain_mix mix
    where mix.name = 'Default caption mix'
  );
