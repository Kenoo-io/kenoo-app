-- Keep the live database default aligned with Projects' deployment-first
-- completion workflow. Existing repository-specific rules are preserved.
alter table public.project_github_repository_automations
  alter column completion_mode set default 'deployment';
