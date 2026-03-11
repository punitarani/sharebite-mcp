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

### Gotchas

- There are no automated tests in this repo. Validation is done via lint + type check + manual MCP calls.
- `bun run start:http` uses Bun's `Bun.serve()` which creates a child process (PID differs from the shell PID). Use `lsof -i :3001` to find the actual process when you need to stop it.
- The `scripts/setup-cookies.ts` script is interactive (reads from stdin). When automating, pass `--cookie` flag: `bun run setup --cookie "sessionid=abc123"`.
- **Never run `bun run db:migrate` or `bun run db:generate`** — this project has no database.
