# Kenoo MCP

Kenoo's Model Context Protocol server exposes narrowly scoped, authenticated
tools to AI clients. It does not use a Supabase service-role key: every tool
request is executed with the connected user's Supabase access token, so RLS
remains the authorization boundary.

## Current tools

The server exposes account-scoped Kenoo and AdPilot tools:

- `kenoo_get_current_user`, `kenoo_list_my_accounts`, and `kenoo_list_projects`
- `kenoo_list_tasks`, `kenoo_get_project`, `kenoo_create_project`,
  `kenoo_update_project`, and `kenoo_delete_project`
- `kenoo_create_task`, `kenoo_update_task`, and `kenoo_delete_task`
- `kenoo_list_project_members`, `kenoo_search_users`, and
  `kenoo_set_project_members` for project access and role-based ownership
- `kenoo_list_task_blockers` and `kenoo_set_task_blockers` for task dependencies

Project and task mutation tools are account-scoped and execute with the
connected user's Supabase token, so existing RLS policies remain the
authorization boundary. Destructive project/task deletion requires an
explicit `confirm: true` argument. Project owners are required to change
project access or delete projects. Project creation makes the authenticated
creator an owner automatically; `ownerIds` can add additional owners, while
`kenoo_set_project_members` accepts `ownerIds` and `memberIds` to replace both
roles. Task assignment and blocker changes follow
the task's existing project-access rules.
- `adpilot_list_entities` for campaigns, ad sets, and ads with aggregated metrics
- `adpilot_get_best_performing_ads`
- `adpilot_get_audience_breakdown` for age, gender, age/gender, and country
- `adpilot_get_saturation` for reach, audience estimates, and frequency buckets
- `adpilot_list_automation_profiles`, `adpilot_get_automation`, and
  `adpilot_set_automation` for account-scoped AdPilot rules on campaigns and
  ad sets, including enable/disable, profile selection, budget bounds,
  cooldown, and supported stop-loss settings
- `adpilot_get_ad_runtime` for the earliest day with recorded ad impressions
  in Kenoo's available daily metrics history
- `adpilot_set_ad_delivery_status` to activate or pause an individual ad on its
  connected Meta or Google Ads account

`rangeDays: 1` represents the latest daily metric window available in the
warehouse. It is not a rolling wall-clock 24-hour query. AdPilot write tools
that can affect provider delivery or spend should be added through audited,
explicit mutation endpoints rather than direct generic database writes. The
current automation mutation changes AdPilot's rules state; it does not directly
edit provider campaigns. Individual ad activation and pausing use a separate
authenticated AdPilot endpoint and update provider delivery status.

## Local development

Copy the root environment values into `apps/mcp/.env` or use the root
`.env.local`, then run:

```bash
pnpm --filter @walls/mcp dev
```

The local HTTP endpoint is `http://localhost:3002/mcp`. It only accepts OAuth
access tokens issued to an MCP client in HTTP mode. Stdio is development-only
and uses the explicit `MCP_DEV_ACCESS_TOKEN` environment variable.

For a local editor integration, set `MCP_DEV_ACCESS_TOKEN` and run
`pnpm --filter @walls/mcp start:stdio` after building.

## Production deployment

Deploy the HTTP transport as a stateless service at `https://mcp.kenoo.io/mcp`.
`infrastructure/template.yaml` creates the complete AWS runtime:

- An ACM certificate and custom domain for `mcp.kenoo.io`. If its DNS is in
  Route 53, the stack also validates the certificate and creates the alias
  record automatically.
- API Gateway HTTP API with TLS 1.2, access logs, API-level throttling, and its
  default `execute-api` domain disabled.
- An arm64 Lambda container with no provisioned concurrency, a reserved
  concurrency ceiling, and finite log retention.

The stack is intentionally not placed in a VPC. The MCP calls Supabase's public
HTTPS APIs, and a NAT gateway would introduce a fixed monthly cost without
helping this service.

Before first deployment, choose one certificate path:

- **Route 53 DNS:** provide `McpHostedZoneId`; the stack creates and validates
  the ACM certificate and DNS alias itself.
- **External DNS:** create and DNS-validate an ACM certificate for
  `mcp.kenoo.io` in `us-east-2`, create the DNS record with your provider, and
  provide its ARN as `McpCertificateArn`.

Deploy from the repository root:

```bash
sam build --template-file apps/mcp/infrastructure/template.yaml
sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name kenoo-mcp \
  --resolve-image-repos \
  --capabilities CAPABILITY_IAM \
  --guided
```

The first deployment prompts for the certificate configuration, Supabase URL,
and Supabase anonymous key. It creates the ECR image repository automatically.
Keep the default 50 concurrent Lambda requests and 50 requests/second API limit
until tool usage establishes a reason to raise them. Neither setting provisions
warm instances or creates idle compute charges.

### External DNS (Kenoo.io)

`kenoo.io` is currently managed outside Route 53. Create an ACM public
certificate for `mcp.kenoo.io` in `us-east-2`, add the CNAME validation record
that ACM provides at the DNS provider, and wait for its status to become
`Issued`. Supply that certificate ARN as `McpCertificateArn`; do not supply a
Route 53 hosted-zone ID. The DNS record that points `mcp.kenoo.io` to API
Gateway must also be created at the DNS provider after the stack creates the
custom domain.

## Continuous deployment

`.github/workflows/deploy-mcp.yml` deploys the stack on changes to `apps/mcp`
after these repository settings are configured:

- GitHub variable `AWS_DEPLOY_ROLE_ARN` (already used by the existing AWS
  deployment workflow).
- GitHub variable `MCP_DOMAIN_NAME=mcp.kenoo.io`.
- GitHub variable `MCP_CERTIFICATE_ARN` with the issued `mcp.kenoo.io` ACM
  certificate ARN.
- GitHub secret `MCP_SUPABASE_URL`.
- GitHub secret `MCP_SUPABASE_ANON_KEY`.

`MCP_HOSTED_ZONE_ID` is only needed if DNS is later moved to Route 53. The AWS
deployment role needs permission to manage the SAM/CloudFormation stack, ECR,
Lambda, API Gateway, CloudWatch Logs, and IAM roles that SAM creates.
`AdPilotApiUrl` defaults to `https://adpilot.kenoo.io`; set it to the AdPilot
origin for the target environment when deploying elsewhere.

## Supabase OAuth setup

Kenoo uses Supabase's OAuth 2.1 authorization server. Before the first
production deployment, an operator must enable **Auth → OAuth Server** in the
Supabase dashboard and set its Authorization Path to `/mcp/authorize` (with
`https://portal.kenoo.io` as the Site URL). Supabase then provides discovery,
authorization-code exchange, token refresh, consent, revocation, and dynamic
client registration for compatible MCP clients.

The Portal authorization screen displays every account the person can access,
records the selected account in the reusable `account_authorizations` table,
then lets Supabase complete the OAuth redirect. A connection is restricted to
that selected account; the MCP independently verifies the signed OAuth
`client_id` and looks up the matching authorization before servicing a tool.

Supply only the Supabase URL and anonymous key to the Lambda stack; never the
service-role key.

Do not add a Supabase service-role key to this app. Do not expose generic SQL
or unrestricted database tools. Add one tool at a time through the same Kenoo
domain authorization rules used by the web applications.

## Production verification

After CloudFormation reports success, verify the public service before adding
it to an AI client:

```bash
curl -fsS https://mcp.kenoo.io/health
curl -fsS https://mcp.kenoo.io/.well-known/oauth-protected-resource/mcp
curl -i https://mcp.kenoo.io/mcp
```

The last request must return `401` and include a `WWW-Authenticate` header
with `resource_metadata`. Then enable the Supabase OAuth server, dynamic client
registration, and `/mcp/authorize` authorization path before scanning tools in
ChatGPT or signing in from Claude.
