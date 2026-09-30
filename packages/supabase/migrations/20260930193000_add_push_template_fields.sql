-- Push templates need a visible title and body, plus optional tap behavior and image.
alter table public.flows_templates
  add column title text,
  add column action_url text,
  add column image_url text;

alter table public.flows_templates
  drop constraint flows_templates_check,
  drop constraint flows_templates_check1;

alter table public.flows_templates
  add constraint flows_templates_channel_content_check check (
    (channel = 'email' and (html_content is not null or text_content is not null))
    or (
      channel = 'sms'
      and text_content is not null
      and title is null
      and action_url is null
      and image_url is null
    )
    or (
      channel = 'push'
      and title is not null
      and text_content is not null
    )
  );
