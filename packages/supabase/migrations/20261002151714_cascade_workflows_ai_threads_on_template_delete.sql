-- AI threads belong to the template they were created for. Remove their
-- messages through the existing workflows_ai_messages cascade as well.
alter table public.workflows_ai_threads
  drop constraint workflows_ai_threads_template_id_fkey;

alter table public.workflows_ai_threads
  add constraint workflows_ai_threads_template_id_fkey
  foreign key (template_id)
  references public.workflows_templates(id)
  on delete cascade;
