-- Rename the Workflows product schema objects and public app identity.
alter table public.flow_audience rename to workflow_audience;
alter table public.flow_event_occurrences rename to workflow_event_occurrences;
alter table public.flow_event_presets rename to workflow_event_presets;
alter table public.flow_events rename to workflow_events;
alter table public.flow_workflow_runs rename to workflow_workflow_runs;
alter table public.flow_workflow_step_runs rename to workflow_workflow_step_runs;
alter table public.flow_workflow_versions rename to workflow_workflow_versions;
alter table public.flow_workflows rename to workflow_workflows;
alter table public.flows_template_upload_folder_memberships rename to workflows_template_upload_folder_memberships;
alter table public.flows_template_uploads rename to workflows_template_uploads;
alter table public.flows_templates rename to workflows_templates;
alter table public.flows_upload_folders rename to workflows_upload_folders;

update public.platform_api_keys
set scopes = array_replace(scopes, 'flows:events:write', 'workflows:events:write')
where 'flows:events:write' = any(scopes);

update public.apps
set slug = 'workflows',
    name = 'Workflows',
    description = 'Customer journeys and email automations.',
    url_redirect = '/workflows',
    subdomain = 'workflows',
    updated_at = now()
where slug = 'flows';

update public.apps
set kenoo_icon_urls = replace(kenoo_icon_urls, '/flows.png', '/workflows.png'),
    updated_at = now()
where slug = 'workflows' and kenoo_icon_urls like '%/flows.png';
