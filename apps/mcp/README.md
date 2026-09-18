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

The local HTTP endpoint is `http://localhost:3002/mcp`. Send a normal Supabase
user access token in `Authorization: Bearer <token>`.

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

The production integration must add a Kenoo OAuth authorization server and
issue short-lived user tokens with explicit MCP scopes before exposing the
endpoint to third-party clients. Supply only the Supabase URL and anonymous key
to the Lambda stack; never the service-role key.

Do not add a Supabase service-role key to this app. Do not expose generic SQL
or unrestricted database tools. Add one tool at a time through the same Kenoo
domain authorization rules used by the web applications.
