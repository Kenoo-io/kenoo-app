import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import express, { type Request, type Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { authenticateKenooUser, extractBearerToken } from "./auth.js";
import { createKenooMcpServer } from "./server.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(currentDirectory, "../../..");
dotenv.config({ path: path.join(repositoryRoot, ".env.local") });
dotenv.config({ path: path.join(repositoryRoot, ".env") });

type StartOptions = { http: boolean; port: number };

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
  const server = createKenooMcpServer(identity);
  await server.connect(new StdioServerTransport());
  console.error("[kenoo-mcp] stdio transport ready");
}

async function handleMcpRequest(request: Request, response: Response) {
  const accessToken = extractBearerToken(request.header("authorization"));
  if (!accessToken) {
    response.status(401).json({ error: "Bearer authentication is required." });
    return;
  }

  try {
    const identity = await authenticateKenooUser(accessToken);
    const server = createKenooMcpServer(identity);
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
    response.status(401).json({ error: message });
  }
}

async function startHttp(port: number) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request, response) => {
    response.json({ ok: true, service: "kenoo-mcp", version: "0.1.0" });
  });
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
