import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OwnedToolServer, type OwningTeam } from "./tool-registry.js";
import { registerGroupOrderTools } from "./tools/group-orders.js";
import { registerOrderTools } from "./tools/orders.js";
import { registerRestaurantTools } from "./tools/restaurants.js";
import { registerUserTools } from "./tools/user.js";

export const server = new McpServer({
  name: "sharebite-mcp",
  version: "1.0.0",
});

// All Sharebite tools are maintained by this team. Use a stable team slug so
// ownership remains actionable when individual contributors change.
const owningTeam: OwningTeam = "workplace-experience";
const ownedTools = new OwnedToolServer(server, owningTeam);

registerUserTools(ownedTools);
registerGroupOrderTools(ownedTools);
registerRestaurantTools(ownedTools);
registerOrderTools(ownedTools);
