# Kenoo MCP

Kenoo's Model Context Protocol server exposes narrowly scoped, authenticated
tools to AI clients. It does not use a Supabase service-role key: every tool
request is executed with the connected user's Supabase access token, so RLS
remains the authorization boundary.

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

## Production shape

Deploy the HTTP transport as a stateless service at `https://mcp.kenoo.com/mcp`.
`infrastructure/template.yaml` packages the service as an arm64 Lambda
container behind API Gateway HTTP API; it does not provision anything until an
operator deploys it with AWS credentials.

```bash
sam build --template-file apps/mcp/infrastructure/template.yaml
sam deploy --guided
```

## OAuth setup

Kenoo uses Supabase's OAuth 2.1 authorization server. Before the first
production deployment, an operator must enable **Auth → OAuth Server** in the
Supabase dashboard and set its Authorization Path to `/mcp/authorize` (with
`https://portal.kenoo.com` as the Site URL). Supabase then provides discovery,
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
