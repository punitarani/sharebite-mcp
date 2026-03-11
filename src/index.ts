import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env manually so this works with both Bun and Node/tsx
try {
  const envPath = resolve(import.meta.dirname ?? ".", "..", ".env");
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex);
    const value = trimmed.slice(eqIndex + 1);
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  // .env file not found — that's fine, env vars may be set externally
}

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { server } from "./server.js";

const useHttp = process.argv.includes("--http") || process.env.TRANSPORT === "http";

if (useHttp) {
  const port = Number(process.env.PORT) || 3001;

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  await server.connect(transport);

  Bun.serve({
    port,
    routes: {
      "/mcp": {
        POST: (req) => transport.handleRequest(req),
        GET: (req) => transport.handleRequest(req),
        DELETE: (req) => transport.handleRequest(req),
      },
      "/health": {
        GET: () => new Response("ok"),
      },
    },
    fetch() {
      return new Response("Not found", { status: 404 });
    },
  });

  console.error(`Sharebite MCP server (HTTP) listening on http://localhost:${port}/mcp`);
} else {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
