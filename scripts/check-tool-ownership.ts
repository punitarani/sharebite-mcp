import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { server } from "../src/server.js";
import { OWNING_TEAM_META_KEY } from "../src/tool-registry.js";

const toolsDirectory = join(import.meta.dirname ?? ".", "..", "src", "tools");
const toolModules = readdirSync(toolsDirectory).filter((file) => file.endsWith(".ts") && file !== "index.ts");

const violations = toolModules.flatMap((file) => {
  const source = readFileSync(join(toolsDirectory, file), "utf-8");
  const errors: string[] = [];

  if (!source.includes("OwnedToolServer")) {
    errors.push(`${file}: tool modules must accept OwnedToolServer`);
  }
  if (source.includes("McpServer")) {
    errors.push(`${file}: import OwnedToolServer instead of bypassing ownership metadata`);
  }

  return errors;
});

if (violations.length > 0) {
  throw new Error(`Tool ownership check failed:\n${violations.join("\n")}`);
}

const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
const client = new Client({ name: "ownership-check", version: "1.0.0" });

await server.connect(serverTransport);
await client.connect(clientTransport);
const { tools } = await client.listTools();
const unownedTools = tools.filter((tool) => {
  const owner = tool._meta?.[OWNING_TEAM_META_KEY];
  return typeof owner !== "string" || !owner.trim();
});

await client.close();
await server.close();

if (unownedTools.length > 0) {
  throw new Error(`Tools missing ${OWNING_TEAM_META_KEY}: ${unownedTools.map((tool) => tool.name).join(", ")}`);
}

console.log(`Verified ownership enforcement for ${tools.length} MCP tools in ${toolModules.length} tool modules.`);
