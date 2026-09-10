import type { McpServer, ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";

/** Metadata key exposed with each tool through the MCP tools/list response. */
export const OWNING_TEAM_META_KEY = "io.joinhandshake/owning-team";

/**
 * A non-empty team identifier. Prefer a stable team slug, such as
 * "workplace-experience", instead of an individual's name.
 */
export type OwningTeam = string;

function assertOwningTeam(owningTeam: OwningTeam): void {
  if (!owningTeam.trim()) {
    throw new Error("MCP tools must declare a non-empty owning team");
  }
}

/**
 * The only tool-registration surface used by this server. It requires ownership
 * once per tool group and publishes that ownership to MCP clients in `_meta`.
 */
export class OwnedToolServer {
  constructor(
    private readonly server: McpServer,
    private readonly owningTeam: OwningTeam,
  ) {
    assertOwningTeam(owningTeam);
  }

  tool<Args extends ZodRawShapeCompat>(
    name: string,
    description: string,
    inputSchema: Args,
    handler: ToolCallback<Args>,
  ) {
    return this.server.registerTool(
      name,
      {
        description,
        inputSchema,
        _meta: { [OWNING_TEAM_META_KEY]: this.owningTeam },
      },
      handler,
    );
  }
}
