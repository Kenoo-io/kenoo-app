-- Deleting a GitHub branch before its PR merges disconnects it from the task.
-- Keep merged branches as audit history so later deployment events can still
-- resolve the task after GitHub's normal post-merge branch cleanup.
alter table public.project_task_github_branches
  add column if not exists pull_request_merged_at timestamptz,
  add column if not exists branch_deleted_at timestamptz;
