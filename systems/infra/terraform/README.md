# Kenoo systems infra (Terraform)

One shared ECS Fargate cluster (`kenoo-systems`) on the Kenoo AWS account.
Every worker under `systems/` gets its own ECR repo, its own Secrets Manager
entry, and its own ECS service — sized and scaled independently, deployed
independently.

## One-time setup (already done for this account, keep for reference)

```bash
cd systems/infra/terraform/bootstrap
terraform init
terraform apply
```

Creates the S3 bucket + DynamoDB table the root config's state lives in.
Only needs to run again if that bucket/table is ever destroyed.

## Applying the root config

```bash
cd systems/infra/terraform
terraform init
terraform apply
```

After the first apply:

1. **Fill in real secret values** (Terraform only creates the container with
   placeholder values — it never writes real API keys):
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id kenoo/people-enrichment/env \
     --secret-string '{
       "SUPABASE_SERVICE_ROLE_KEY": "...",
       "SERPER_API_KEY": "...",
       "OPENAI_API_KEY": "..."
     }'
   ```
   Then force a deployment so the running task picks them up:
   ```bash
   aws ecs update-service --cluster kenoo-systems --service people-enrichment --force-new-deployment
   ```

2. **Wire up GitHub Actions.** `terraform output github_actions_role_arn` gives
   you a role ARN — set it as a repo variable (not a secret; it's just an ARN,
   and only this repo's `main` branch can assume it):
   Settings → Secrets and variables → Actions → Variables → New repository
   variable → `AWS_DEPLOY_ROLE_ARN`.

3. **Push an image.** The task definition points at `:latest`, which doesn't
   exist until something pushes to it — either merge to `main` (CI builds and
   pushes automatically) or push once by hand:
   ```bash
   aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-2.amazonaws.com
   docker build --build-arg SYSTEM_NAME=people_enrichment -f systems/infra/Dockerfile -t <ecr-repo-url>:latest ..
   docker push <ecr-repo-url>:latest
   ```

## Adding system #2 (and #3...#50)

1. Write the worker under `systems/<name>/`, same shape as `people_enrichment/`.
2. Add `"<name>*"` to the `include` list in `systems/pyproject.toml` so the
   Docker build's `pip install -e .` picks it up.
3. Add an entry to `locals.systems` in `main.tf`:
   ```hcl
   my-new-worker = {
     cpu           = 256
     memory        = 512
     desired_count = 1
     environment   = { SOME_VAR = "value" }
     secret_keys   = ["SOME_API_KEY"]
   }
   ```
4. Add it to `systems/infra/systems.json` (this is what drives the CI matrix):
   ```json
   { "package": "my_new_worker", "ecs_service": "my-new-worker" }
   ```
5. `terraform apply` — creates the ECR repo, secret, log group, and service.
6. Fill in its secret (step 1 above) and push (step 3 above), or just merge
   to `main` and let CI do it.

## Notes / deliberate simplifications

- **No NAT gateway.** Tasks run in the default VPC's public subnets with a
  public IP, since they only make outbound calls (Supabase, OpenAI, etc.) and
  never need inbound. A NAT gateway is ~$32/mo *per system* for something
  these workers don't use — skip it unless a system needs a stable outbound
  IP or the account's security posture changes.
- **Scale-to-zero via a wake queue.** Each system gets a companion SQS queue
  (`kenoo-<name>-wake`) that carries no job payload — the job data lives in
  Supabase's `systems_jobs` table, which stays the source of truth. Enqueuing
  a job also sends a bare SQS message purely so Application Auto Scaling sees
  queue depth > 0 and scales `desired_count` 0 → N; see
  `systems/shared/queue.py` and `worker_loop.py` for why the worker holds the
  message open (received, not deleted) until its DB backlog is drained.
  `claim_next_job` (`systems/shared/jobs.py`) uses a conditional
  `UPDATE ... WHERE status = 'pending'`, so it's safe for multiple tasks to
  claim from the same table concurrently — set `max_capacity` per system in
  `locals.systems` (default 1) to let it actually scale out under load.
- **`:latest` tag, not immutable digests.** Keeps CI simple (build, push,
  force-new-deployment) at the cost of the task definition not recording
  exactly which image is running — `aws ecs describe-tasks` will tell you
  the digest actually deployed if you need to know.
