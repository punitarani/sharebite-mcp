import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet } from "../api.js";
import { transform } from "../models.js";

export function registerGroupOrderTools(server: McpServer) {
  server.tool(
    "get_this_week_group_orders",
    "Get this week's available group orders for the user's location",
    {
      timezone: z.string().describe("IANA timezone, e.g. America/Los_Angeles"),
      latitude: z.string().describe("Delivery latitude"),
      longitude: z.string().describe("Delivery longitude"),
    },
    async ({ timezone, latitude, longitude }) => {
      try {
        const result = await apiGet("/users/homepage/this-weeks-group-orders/", {
          timezone,
          latitude,
          longitude,
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(transform.groupOrders.thisWeek(result), null, 2) }],
        };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    },
  );

  server.tool(
    "get_group_order_details",
    "Get details for a specific group order by slug",
    {
      slug: z.string().optional().describe("Group order slug identifier. Omit to list all active group orders."),
    },
    async ({ slug }) => {
      try {
        const params: Record<string, string> = {};
        if (slug) params.slug = slug;
        const result = await apiGet("/grouporder/user_grouporders/", params);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(transform.groupOrders.details(result), null, 2) }],
        };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    },
  );

  server.tool(
    "get_group_order_restaurant_capacity",
    "Check remaining order capacity for a restaurant within a group order",
    {
      restaurant: z.string().describe("Restaurant ID"),
      group_order: z.string().describe("Group order ID (numeric)"),
    },
    async ({ restaurant, group_order }) => {
      try {
        const result = await apiGet("/grouporder/get_group_order_restaurant_capacity/", {
          restaurant,
          group_order,
        });
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    },
  );

  server.tool(
    "get_group_order_popular_items",
    "Get popular menu items for a group order's restaurant",
    {
      group_order_id: z.string().describe("Group order ID (numeric)"),
      delivery_status: z.string().optional().describe("Delivery status (1 for delivery)"),
      future_order_date: z.string().optional().describe("Future order date, e.g. 2026-03-12 12:00:00"),
      timezone: z.string().optional().describe("IANA timezone"),
    },
    async ({ group_order_id, delivery_status, future_order_date, timezone }) => {
      try {
        const params: Record<string, string> = {};
        if (delivery_status) params.delivery_status = delivery_status;
        if (future_order_date) params.future_order_date = future_order_date;
        if (timezone) params.timezone = timezone;
        const result = await apiGet(`/grouporder/group_order_popular_items/${group_order_id}/`, params);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(transform.groupOrders.popularItems(result), null, 2) },
          ],
        };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    },
  );
}
