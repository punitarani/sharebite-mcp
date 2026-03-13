# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Sharebite MCP server — a TypeScript MCP server wrapping the Sharebite corporate food ordering API. Single-package repo, no database, no Docker.

### Runtime

Bun is the runtime and package manager. See `CLAUDE.md` for Bun usage conventions.

### Key commands

| Task | Command |
|------|---------|
| Install deps | `bun install` |
| Lint | `bun run lint` |
| Lint + fix | `bun run lint:fix` |
| Format | `bun run format` |
| Type check | `bunx tsc --noEmit` |
| Start (STDIO) | `bun run start` |
| Start (HTTP) | `bun run start:http` |

### Running the server

- **HTTP mode** (`bun run start:http`): listens on `http://localhost:3001/mcp` with a `/health` endpoint for smoke testing. Use this for quick verification.
- **STDIO mode** (`bun run start`): default, for MCP clients like Claude Code. Reads/writes JSON-RPC over stdin/stdout.
- The server starts without valid credentials but all tool calls will return auth errors. Set `SHAREBITE_SESSION_ID` and `SHAREBITE_BASE_URL` in `.env` (see `.env.example`).

### Smoke-testing with the MCP SDK client

To verify end-to-end connectivity in HTTP mode, use the MCP SDK client from a script:

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3001/mcp"));
const client = new Client({ name: "test", version: "1.0.0" });
await client.connect(transport);
const result = await client.callTool({ name: "get_user_info", arguments: {} });
console.log(JSON.stringify(result, null, 2));
await client.close();
```

The `/health` endpoint (`curl localhost:3001/health`) returns `ok` and does not require auth — use it for liveness checks.

### Gotchas

- There are no automated tests in this repo. Validation is done via lint + type check + manual MCP calls.
- The HTTP transport uses the Streamable HTTP MCP protocol. Plain `curl` calls to `/mcp` require `Accept: application/json, text/event-stream` headers. Each server instance only accepts one `initialize` call — restart the server for a fresh session.
- `bun run start:http` uses Bun's `Bun.serve()` which creates a child process (PID differs from the shell PID). Use `lsof -i :3001` to find the actual process when you need to stop it.
- The `scripts/setup-cookies.ts` script is interactive (reads from stdin). When automating, pass `--cookie` flag: `bun run setup --cookie "sessionid=abc123"`.
- **Never run `bun run db:migrate` or `bun run db:generate`** — this project has no database.
