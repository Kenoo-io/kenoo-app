import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ListToolsRequestSchema, type ListToolsResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import type { KenooIdentity } from "./auth.js";

function text(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

const OAUTH_SECURITY_SCHEMES = [{ type: "oauth2", scopes: ["openid", "profile", "email"] }];

function authenticationRequired(challenge: string) {
  return {
    content: [{ type: "text" as const, text: "Authentication required. Connect your Kenoo account to continue." }],
    isError: true,
    _meta: { "mcp/www_authenticate": [challenge] },
  };
}

async function resolveAccountId(identity: KenooIdentity) {
  if (!identity.clientId) return null;

  const { data, error } = await identity.supabase
    .from("account_authorizations")
    .select("account_id")
    .eq("user_id", identity.user.id)
    .eq("authorization_server", "supabase")
    .eq("client_id", identity.clientId)
    .eq("resource", "mcp")
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw error;

  return data?.account_id ?? null;
}

export function createKenooMcpServer(identity: KenooIdentity | null, authChallenge: string) {
  const server = new McpServer({ name: "kenoo-mcp", version: "0.1.0" });

  server.registerTool(
    "kenoo_get_current_user",
    {
      title: "Get current Kenoo user",
      description: "Return the identity associated with the authenticated Kenoo account.",
      annotations: { readOnlyHint: true },
      // SDK v1 forwards custom metadata; the explicit tools/list response below
      // adds this as a top-level field for clients that support the current spec.
      _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      inputSchema: {},
    },
    async () => {
      if (!identity) return authenticationRequired(authChallenge);
      return text({
        id: identity.user.id,
        email: identity.user.email ?? null,
        createdAt: identity.user.created_at,
      });
    },
  );

  server.registerTool(
    "kenoo_list_my_accounts",
    {
      title: "Get connected Kenoo account",
      description: "Return the single Kenoo account selected when this connection was authorized.",
      annotations: { readOnlyHint: true },
      _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      inputSchema: {},
    },
    async () => {
      if (!identity) return authenticationRequired(authChallenge);
      const accountId = await resolveAccountId(identity);
      return text({ accountId, connected: Boolean(accountId) });
    },
  );

  server.registerTool(
    "kenoo_list_projects",
    {
      title: "List my projects",
      description:
        "List projects the authenticated user owns or belongs to. Results are scoped to the Kenoo account selected during authorization.",
      annotations: { readOnlyHint: true },
      _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe("Maximum projects to return. Defaults to 25."),
      },
    },
    async ({ limit = 25 }) => {
      if (!identity) return authenticationRequired(authChallenge);
      const accountId = await resolveAccountId(identity);
      if (!accountId) {
        return text({ projects: [], message: "This connection does not have a selected Kenoo account." });
      }

      const { data: memberRows, error: memberError } = await identity.supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", identity.user.id);
      if (memberError) throw memberError;

      const memberProjectIds = (memberRows ?? []).map((row) => row.project_id);
      const accessFilter = memberProjectIds.length
        ? `owner_id.eq.${identity.user.id},id.in.(${memberProjectIds.join(",")})`
        : `owner_id.eq.${identity.user.id}`;
      const { data, error } = await identity.supabase
        .from("projects")
        .select("id, name, slug, description, status, start_date, due_date, completed_at, owner_id, account_id, priority, color, created_at, updated_at")
        .eq("account_id", accountId)
        .or(accessFilter)
        .order("name")
        .limit(limit);

      if (error) throw error;
      return text({ accountId, projects: data ?? [] });
    },
  );

  // @modelcontextprotocol/sdk v1 does not yet expose `securitySchemes` in its
  // registerTool type, so add the standards field at the wire boundary while
  // retaining `_meta.securitySchemes` for older clients.
  server.server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: [
      {
        name: "kenoo_get_current_user",
        title: "Get current Kenoo user",
        description: "Return the identity associated with the authenticated Kenoo account.",
        inputSchema: { type: "object", properties: {} },
        annotations: { readOnlyHint: true },
        securitySchemes: OAUTH_SECURITY_SCHEMES,
        _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      },
      {
        name: "kenoo_list_my_accounts",
        title: "Get connected Kenoo account",
        description: "Return the single Kenoo account selected when this connection was authorized.",
        inputSchema: { type: "object", properties: {} },
        annotations: { readOnlyHint: true },
        securitySchemes: OAUTH_SECURITY_SCHEMES,
        _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      },
      {
        name: "kenoo_list_projects",
        title: "List my projects",
        description: "List projects the authenticated user owns or belongs to. Results are scoped to the Kenoo account selected during authorization.",
        inputSchema: {
          type: "object",
          properties: { limit: { type: "integer", minimum: 1, maximum: 100 } },
        },
        annotations: { readOnlyHint: true },
        securitySchemes: OAUTH_SECURITY_SCHEMES,
        _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      },
    ],
  }) as unknown as ListToolsResult);

  return server;
}
