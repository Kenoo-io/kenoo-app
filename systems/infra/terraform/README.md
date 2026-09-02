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
- **No scale-to-zero yet.** `people_enrichment` polls Supabase directly
  rather than consuming from a queue, so there's no queue-depth signal to
  scale on. `desired_count` is a flat 1 (~$7-10/mo per small worker). If a
  future system is bursty enough to matter, revisit with SQS +
  Application Auto Scaling (or an EventBridge-scheduled Lambda that flips
  `desired_count`) — resist adding that complexity before it's needed.
- **`:latest` tag, not immutable digests.** Keeps CI simple (build, push,
  force-new-deployment) at the cost of the task definition not recording
  exactly which image is running — `aws ecs describe-tasks` will tell you
  the digest actually deployed if you need to know.
