insert into public.generation_requests (status, provider, input, output)
select 'completed', 'Google Gemini', 'Historical caption: ' || captions.id::text, captions.caption
from public.captions
where not exists (
  select 1
  from public.generation_requests requests
  where requests.input = 'Historical caption: ' || captions.id::text
);

insert into public.llm_responses (request_id, provider, response)
select requests.id, requests.provider, requests.output
from public.generation_requests requests
where requests.input like 'Historical caption: %'
  and not exists (
    select 1 from public.llm_responses responses where responses.request_id = requests.id
  );

create or replace function public.capture_caption_operation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  request_id uuid;
  request_input text;
  provider_name text := 'Google Gemini';
  model_name text := null;
begin
  request_input := coalesce('Image: ' || (select image_url from public.images where id = new.image_id), 'Caption generation');

  insert into public.generation_requests (status, provider, model, input, output)
  values ('completed', provider_name, model_name, request_input, new.caption)
  returning id into request_id;

  insert into public.llm_responses (request_id, provider, model, response)
  values (request_id, provider_name, model_name, new.caption);

  return new;
end;
$$;

drop trigger if exists capture_caption_operation on public.captions;
create trigger capture_caption_operation
after insert on public.captions
for each row execute function public.capture_caption_operation();
