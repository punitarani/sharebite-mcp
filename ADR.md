# ADR: Sharebite MCP Server Implementation

## Status

Proposed

## Context

We need a Model Context Protocol (MCP) server that exposes Sharebite's corporate food ordering API as tools for AI
assistants. The server will run locally on a user's machine, authenticating via session cookies provided as environment
variables. It must support both STDIO and HTTP transports.

## Decision

### Tech Stack

| Component   | Choice                      | Rationale                                     |
|-------------|-----------------------------|-----------------------------------------------|
| Runtime     | Bun                         | Project standard per CLAUDE.md                |
| Language    | TypeScript                  | Type safety, matches Bun ecosystem            |
| MCP SDK     | `@modelcontextprotocol/sdk` | Official MCP SDK for TypeScript               |
| Validation  | Zod                         | Schema validation, used by MCP SDK internally |
| HTTP Client | `fetch` (built-in)          | No dependencies needed; Bun has native fetch  |

### Project Structure

```
sharebite-mcp/
├── src/
│   ├── index.ts              # Entry point — transport selection, server startup
│   ├── server.ts             # MCP server setup, tool registration
│   ├── tools/
│   │   ├── index.ts          # Tool registry — exports all tools
│   │   ├── user.ts           # get_login_status, get_corporate_allowance, get_user_selections, get_user_credit_balance
│   │   ├── group-orders.ts   # get_this_week_group_orders, get_group_order_details, get_group_order_restaurant_capacity, get_group_order_popular_items
│   │   ├── restaurants.ts    # search_restaurants, get_restaurant_details, get_restaurant_menu, get_menu_item_detail, get_restaurant_popular_items, check_restaurant_open, get_user_previous_order_items, get_checkout_item_suggestions
│   │   └── orders.ts         # get_recent_orders, calculate_order_prices, validate_delivery_address, place_order
│   ├── api.ts                # Sharebite API client — handles auth, base URL, fetch wrapper
│   └── schemas.ts            # Zod schemas for all tool inputs
├── package.json
├── tsconfig.json
├── .env.example              # Documents required env vars
├── CLAUDE.md
├── MCP.md                    # Tool specification
└── ADR.md                    # This document
```

### Architecture

#### 1. Entry Point (`src/index.ts`)

Reads the `--transport` CLI flag (or `TRANSPORT` env var) to decide the transport mode:

- **`stdio`** (default): Uses `StdioServerTransport` from the MCP SDK. The server communicates over stdin/stdout. This
  is the standard mode for Claude Code integration.
- **`http`**: Uses `StreamableHTTPServerTransport` from the MCP SDK, served via `Bun.serve()` on a configurable port (
  default `3001`). This enables browser-based or remote MCP clients.

```ts
import { server } from "./server.ts";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const transport = process.argv.includes("--http") ? "http" : "stdio";

if (transport === "stdio") {
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
} else {
  // HTTP transport via Bun.serve()
  // ...
}
```

#### 2. API Client (`src/api.ts`)

A thin wrapper around `fetch` that:

- Prepends the base URL (`https://<company>.sharebite.com/api/v1`)
- Attaches auth cookies (`sessionid`, `csrftoken`) from env vars
- Attaches the CSRF token as `X-CSRFToken` header for POST requests
- Sets standard headers (`Accept: application/json`, `Content-Type`, `Referer`)
- Returns parsed JSON

```ts
const BASE_URL = process.env.SHAREBITE_BASE_URL || "https://<company>.sharebite.com/api/v1";

const COOKIES = [
  `sessionid=${process.env.SHAREBITE_SESSION_ID}`,
  `csrftoken=${process.env.SHAREBITE_CSRF_TOKEN}`,
].join("; ");

export async function apiGet(path: string, params?: Record<string, string>) {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json",
      "Cookie": COOKIES,
      "Referer": "https://<company>.sharebite.com/",
    },
  });
  return res.json();
}

export async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Cookie": COOKIES,
      "X-CSRFToken": process.env.SHAREBITE_CSRF_TOKEN!,
      "Referer": "https://<company>.sharebite.com/",
    },
    body: JSON.stringify(body),
  });
  return res.json();
}
```

#### 3. Server Setup (`src/server.ts`)

Creates the MCP `Server` instance, registers all tools from the tool modules, and exports it.

```ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerAllTools } from "./tools/index.ts";

export const server = new Server(
  { name: "sharebite-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

registerAllTools(server);
```

#### 4. Tool Modules (`src/tools/*.ts`)

Each tool module exports a function that registers its tools on the server. Each tool:

1. Defines a Zod input schema
2. Calls the API client
3. Returns the response as `text` content

Example pattern:

```ts
import { z } from "zod";
import { apiGet } from "../api.ts";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

const GetThisWeekGroupOrdersInput = z.object({
  timezone: z.string().default("America/Los_Angeles"),
  latitude: z.number(),
  longitude: z.number(),
});

export function registerGroupOrderTools(server: Server) {
  // Tools are registered via server.setRequestHandler for "tools/list" and "tools/call"
}
```

#### 5. Tool Registration Pattern

All tools are collected into a single registry:

```ts
// src/tools/index.ts
const tools: ToolDefinition[] = [
  ...userTools,
  ...groupOrderTools,
  ...restaurantTools,
  ...orderTools,
];

export function registerAllTools(server: Server) {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.schema),
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find(t => t.name === request.params.name);
    if (!tool) throw new Error(`Unknown tool: ${request.params.name}`);
    const args = tool.schema.parse(request.params.arguments);
    const result = await tool.handler(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });
}
```

### Environment Variables

| Variable               | Required | Description                                                      |
|------------------------|----------|------------------------------------------------------------------|
| `SHAREBITE_SESSION_ID` | Yes      | `sessionid` cookie value                                         |
| `SHAREBITE_CSRF_TOKEN` | Yes      | `csrftoken` cookie value                                         |
| `SHAREBITE_BASE_URL`   | No       | API base URL (default: `https://<company>.sharebite.com/api/v1`) |
| `PORT`                 | No       | HTTP transport port (default: 3001)                              |

These go in a `.env` file (auto-loaded by Bun).

### Transport Details

#### STDIO Transport

- Default mode, activated with no flags or `--stdio`
- Used by Claude Code: configure in `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sharebite": {
      "command": "bun",
      "args": [
        "run",
        "/path/to/sharebite-mcp/src/index.ts"
      ],
      "env": {
        "SHAREBITE_SESSION_ID": "your-session-id",
        "SHAREBITE_CSRF_TOKEN": "your-csrf-token"
      }
    }
  }
}
```

#### HTTP Transport

- Activated with `--http` flag
- Serves on `http://localhost:3001/mcp` (configurable via `PORT` env var)
- Uses `StreamableHTTPServerTransport` with `Bun.serve()`
- Supports stateful sessions via session ID headers
- Handles GET (SSE stream), POST (messages), DELETE (session cleanup)

### Error Handling

- API errors (non-2xx responses) are caught and returned as MCP error content with `isError: true`
- Auth failures (401/403) return a clear message telling the user to refresh their session cookies
- Network errors are caught and returned as descriptive error messages
- Zod validation errors for tool inputs are surfaced by the MCP SDK automatically

### Security Considerations

- Session cookies are stored in `.env` (gitignored) or passed via MCP client config
- The server runs locally only — no external exposure
- CSRF token is included on all mutating (POST) requests
- The `.env` file must never be committed (`.gitignore` enforced)

## Implementation Plan

### Phase 1: Project Setup

1. Install dependencies: `bun add @modelcontextprotocol/sdk zod`
2. Create `.env.example` with placeholder values
3. Add `.env` to `.gitignore`
4. Set up `src/` directory structure

### Phase 2: Core Infrastructure

5. Implement `src/api.ts` — the Sharebite API client with `apiGet` / `apiPost`
6. Implement `src/schemas.ts` — Zod schemas for all 20 tool inputs
7. Implement `src/server.ts` — MCP server creation and tool registration framework
8. Implement `src/tools/index.ts` — tool registry with list/call handlers

### Phase 3: Tool Implementation

9. Implement `src/tools/user.ts` — 4 tools: `get_login_status`, `get_corporate_allowance`, `get_user_selections`,
   `get_user_credit_balance`
10. Implement `src/tools/group-orders.ts` — 4 tools: `get_this_week_group_orders`, `get_group_order_details`,
    `get_group_order_restaurant_capacity`, `get_group_order_popular_items`
11. Implement `src/tools/restaurants.ts` — 8 tools: `search_restaurants`, `get_restaurant_details`,
    `get_restaurant_menu`, `get_menu_item_detail`, `get_restaurant_popular_items`, `check_restaurant_open`,
    `get_user_previous_order_items`, `get_checkout_item_suggestions`
12. Implement `src/tools/orders.ts` — 4 tools: `get_recent_orders`, `calculate_order_prices`,
    `validate_delivery_address`, `place_order`

### Phase 4: Transport & Entry Point

13. Implement `src/index.ts` — CLI flag parsing, STDIO transport
14. Add HTTP transport with `StreamableHTTPServerTransport` + `Bun.serve()`

### Phase 5: Polish

15. Add `scripts` to `package.json` (`start`, `start:http`)
16. Create `.env.example`
17. Update `README.md` with setup and usage instructions

## Consequences

### Positive

- Simple, single-process architecture — easy to run and debug
- Direct API passthrough keeps the server thin and maintainable
- Both STDIO and HTTP transports cover all MCP client types
- Zod schemas provide input validation and self-documenting tool definitions

### Negative

- Session cookies expire and must be manually refreshed
- No caching — every tool call hits the Sharebite API directly
- The server trusts the upstream API responses without additional validation

### Risks

- Sharebite API may change endpoints or response formats without notice (no versioning guarantee)
- Session cookies have a limited lifespan — users may need to re-extract them from browser DevTools periodically
