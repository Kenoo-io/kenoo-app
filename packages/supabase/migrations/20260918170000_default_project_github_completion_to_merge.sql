-- Use the most familiar workflow by default: a linked task completes when
-- its pull request is merged into the configured branch (main by default).
-- Existing repository-specific rules are preserved.
alter table public.project_github_repository_automations
  alter column completion_mode set default 'merge';
