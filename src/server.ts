import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGroupOrderTools } from "./tools/group-orders.js";
import { registerOrderTools } from "./tools/orders.js";
import { registerRestaurantTools } from "./tools/restaurants.js";
import { registerUserTools } from "./tools/user.js";

export const server = new McpServer({
  name: "sharebite-mcp",
  version: "1.0.0",
});

registerUserTools(server);
registerGroupOrderTools(server);
registerRestaurantTools(server);
registerOrderTools(server);
