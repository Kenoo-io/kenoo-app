import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import express, { type Request, type Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { authenticateKenooUser, extractBearerToken, getSupabaseConfiguration } from "./auth.js";
import { createKenooMcpServer } from "./server.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(currentDirectory, "../../..");
dotenv.config({ path: path.join(repositoryRoot, ".env.local") });
dotenv.config({ path: path.join(repositoryRoot, ".env") });

type StartOptions = { http: boolean; port: number };

function publicMcpUrl(request: Request) {
  const configuredUrl = process.env.MCP_PUBLIC_URL?.trim().replace(/\/$/, "");
  if (configuredUrl) return `${configuredUrl}/mcp`;

  return `${request.protocol}://${request.get("host")}/mcp`;
}

function protectedResourceMetadataUrl(request: Request) {
  const resourceUrl = publicMcpUrl(request);
  return new URL("/.well-known/oauth-protected-resource/mcp", resourceUrl).toString();
}

function authorizationServerUrl() {
  const { url } = getSupabaseConfiguration();
  return new URL("/auth/v1", url).toString().replace(/\/$/, "");
}

function authenticationChallenge(request: Request) {
  return `Bearer resource_metadata="${protectedResourceMetadataUrl(request)}", error="invalid_token", error_description="Connect your Kenoo account to continue"`;
}

function normalizeMcpAcceptHeader(request: Request) {
  const accept = request.header("accept") ?? "*/*";
  // ChatGPT currently initializes MCP with Accept: */*. The SDK requires both
  // explicit representations even though this stateless endpoint replies with
  // JSON. Preserve the caller's preferences and add the compatible types.
  if (!accept.includes("application/json") || !accept.includes("text/event-stream")) {
    request.headers.accept = `${accept}, application/json, text/event-stream`;
  }
}

function normalizeMcpContentType(request: Request) {
  // ChatGPT labels its initial JSON-RPC probe as application/octet-stream.
  // `/mcp` accepts JSON only, so declare the protocol's required media type
  // before the SDK validates an otherwise valid JSON-RPC body.
  if (!request.header("content-type")?.toLowerCase().startsWith("application/json")) {
    request.headers["content-type"] = "application/json";
  }
}

function parseArguments(argv: string[]): StartOptions {
  const options: StartOptions = { http: false, port: 3002 };
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === "--http") options.http = true;
    if (argv[index] === "--port" && argv[index + 1]) {
      options.port = Number(argv[index + 1]);
      index += 1;
    }
  }
  return options;
}

async function startStdio() {
  const accessToken = process.env.MCP_DEV_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MCP_DEV_ACCESS_TOKEN is required for the local stdio transport.");
  }

  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
  const identity = await authenticateKenooUser(accessToken);
  const server = createKenooMcpServer(identity, "Bearer");
  await server.connect(new StdioServerTransport());
  console.error("[kenoo-mcp] stdio transport ready");
}

async function handleMcpRequest(request: Request, response: Response) {
  normalizeMcpAcceptHeader(request);
  normalizeMcpContentType(request);
  const accessToken = extractBearerToken(request.header("authorization"));
  const challenge = authenticationChallenge(request);
  let identity = null;

  if (accessToken) {
    try {
      identity = await authenticateKenooUser(accessToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to verify the supplied access token.";
      console.warn("[kenoo-mcp] authentication failed", { message });
    }
  }

  try {
    if (!identity?.clientId) {
      identity = null;
    }
    if (!identity) response.set("WWW-Authenticate", challenge);
    const server = createKenooMcpServer(identity, challenge);
    // Stateless transport lets any Lambda invocation serve any request; no
    // session affinity or in-memory state is required to scale horizontally.
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    response.on("close", () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(request, response, request.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process the MCP request.";
    console.warn("[kenoo-mcp] MCP request failed", { message });
    response
      .set("WWW-Authenticate", challenge)
      .status(401)
      .json({ error: message });
  }
}

async function startHttp(port: number) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use((request, response, next) => {
    const accept = request.header("accept") ?? null;
    const contentType = request.header("content-type") ?? null;
    response.on("finish", () => {
      console.info("[kenoo-mcp] request", {
        method: request.method,
        path: request.path,
        status: response.statusCode,
        accept,
        contentType,
        hasBearerToken: Boolean(extractBearerToken(request.header("authorization"))),
      });
    });
    next();
  });

  app.get("/health", (_request, response) => {
    response.json({ ok: true, service: "kenoo-mcp", version: "0.1.0" });
  });
  const protectedResourceMetadata = (request: Request, response: Response) => {
    response.json({
      resource: publicMcpUrl(request),
      authorization_servers: [authorizationServerUrl()],
      bearer_methods_supported: ["header"],
    });
  };
  // Serve both discovery forms. The resource-specific form is canonical for
  // /mcp, while some OAuth clients probe the root well-known path first.
  app.get("/.well-known/oauth-protected-resource", protectedResourceMetadata);
  app.get("/.well-known/oauth-protected-resource/mcp", protectedResourceMetadata);
  app.all("/mcp", handleMcpRequest);

  app.listen(port, () => {
    console.log(`[kenoo-mcp] HTTP transport listening on port ${port}`);
  });
}

const options = parseArguments(process.argv);
if (options.http) {
  await startHttp(options.port);
} else {
  await startStdio();
}
