import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPost } from "../api.js";
import { transform } from "../models.js";

export function registerRestaurantTools(server: McpServer) {
  server.tool(
    "search_restaurants",
    "Search for restaurants available for ordering. Supports filtering by group order, location, and sorting.",
    {
      latitude: z.number().describe("Delivery latitude"),
      longitude: z.number().describe("Delivery longitude"),
      page_num: z.number().optional().default(1).describe("Page number"),
      page_size: z.number().optional().default(20).describe("Results per page"),
      sortby: z
        .string()
        .optional()
        .default("best_match")
        .describe("Sort field: best_match, rating, delivery_time, etc."),
      sort_order: z.string().optional().default("asc").describe("Sort order: asc or desc"),
      delivery_status: z.number().optional().default(1).describe("1 for delivery, 2 for pickup"),
      timezone: z.string().optional().describe("IANA timezone"),
      restaurant_type: z.string().optional().describe("e.g. GROUP_ORDER"),
      group_order_slug: z
        .string()
        .optional()
        .describe("Group order slug to filter restaurants for a specific group order"),
      restaurant_ids: z.string().optional().describe("Comma-separated restaurant IDs to filter"),
      query: z.string().optional().describe("Search query string"),
    },
    async (args) => {
      try {
        const result = await apiPost("/restaurants/search_restaurant/", args);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(transform.restaurants.search(result), null, 2) }],
        };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    },
  );

  server.tool(
    "get_restaurant_details",
    "Get detailed info for a specific restaurant including hours, address, and delivery info",
    {
      restaurant_id: z.string().describe("Restaurant ID"),
      latitude: z.string().optional().describe("Delivery latitude"),
      longitude: z.string().optional().describe("Delivery longitude"),
      future_order_date: z.string().optional().describe("Future order date, e.g. 2026-03-12 12:00:00"),
      timezone: z.string().optional().describe("IANA timezone"),
      delivery_status: z.string().optional().describe("1 for delivery, 2 for pickup"),
    },
    async ({ restaurant_id, ...params }) => {
      try {
        const qp: Record<string, string> = {};
        for (const [k, v] of Object.entries(params)) {
          if (v) qp[k] = v;
        }
        const result = await apiGet(`/restaurants/${restaurant_id}/detail/`, qp);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(transform.restaurants.details(result), null, 2) }],
        };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    },
  );

  server.tool(
    "get_restaurant_menu",
    "Get the full menu for a restaurant including categories, items, and prices",
    {
      restaurant_id: z.string().describe("Restaurant ID"),
      delivery_status: z.string().optional().describe("1 for delivery, 2 for pickup"),
      future_order_date: z.string().optional().describe("Future order date"),
      timezone: z.string().optional().describe("IANA timezone"),
    },
    async ({ restaurant_id, delivery_status, future_order_date, timezone }) => {
      try {
        const params: Record<string, string> = { restaurant_id };
        if (delivery_status) params.delivery_status = delivery_status;
        if (future_order_date) params.future_order_date = future_order_date;
        if (timezone) params.timezone = timezone;
        const result = await apiGet("/restaurants/menu/", params);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(transform.restaurants.menu(result), null, 2) }],
        };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    },
  );

  server.tool(
    "get_menu_item_detail",
    "Get detailed info for a specific menu item including options, modifiers, and prices",
    {
      item_id: z.string().describe("Menu item ID"),
      timezone: z.string().optional().describe("IANA timezone"),
      future_order_time: z.string().optional().describe("Future order time, e.g. 2026-03-12 12:00:00"),
    },
    async ({ item_id, timezone, future_order_time }) => {
      try {
        const params: Record<string, string> = {};
        if (timezone) params.timezone = timezone;
        if (future_order_time) params.future_order_time = future_order_time;
        const result = await apiGet(`/restaurants/item_detail/${item_id}`, params);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(transform.restaurants.menuItemDetail(result), null, 2) },
          ],
        };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    },
  );

  server.tool(
    "get_restaurant_popular_items",
    "Get the most popular items at a restaurant",
    {
      restaurant_id: z.string().describe("Restaurant ID"),
      delivery_status: z.string().optional().describe("1 for delivery"),
      future_order_date: z.string().optional().describe("Future order date"),
    },
    async ({ restaurant_id, delivery_status, future_order_date }) => {
      try {
        const params: Record<string, string> = {};
        if (delivery_status) params.delivery_status = delivery_status;
        if (future_order_date) params.future_order_date = future_order_date;
        const result = await apiGet(`/restaurants/restaurant_popular_items/${restaurant_id}/`, params);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(transform.restaurants.popularItems(result), null, 2) },
          ],
        };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    },
  );

  server.tool(
    "check_restaurant_open",
    "Check if a restaurant is currently open and accepting orders",
    {
      restaurant_id: z.string().describe("Restaurant ID"),
      is_delivery: z.string().optional().default("true").describe("Whether checking for delivery"),
      timezone: z.string().optional().describe("IANA timezone"),
      future_order_date: z.string().optional().describe("Future order date"),
    },
    async ({ restaurant_id, is_delivery, timezone, future_order_date }) => {
      try {
        const params: Record<string, string> = { restaurant_id };
        if (is_delivery) params.is_delivery = is_delivery;
        if (timezone) params.timezone = timezone;
        if (future_order_date) params.future_order_date = future_order_date;
        const result = await apiGet("/restaurants/is_rest_open/", params);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    },
  );

  server.tool(
    "get_user_previous_order_items",
    "Get items the user has previously ordered from a restaurant",
    {
      restaurant_id: z.string().describe("Restaurant ID"),
      delivery_status: z.string().optional().describe("1 for delivery"),
      future_order_date: z.string().optional().describe("Future order date"),
    },
    async ({ restaurant_id, delivery_status, future_order_date }) => {
      try {
        const params: Record<string, string> = {};
        if (delivery_status) params.delivery_status = delivery_status;
        if (future_order_date) params.future_order_date = future_order_date;
        const result = await apiGet(`/users/user_previous_order_items/${restaurant_id}/`, params);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(transform.restaurants.previousOrderItems(result), null, 2) },
          ],
        };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    },
  );

  server.tool(
    "get_checkout_item_suggestions",
    "Get item suggestions at checkout to help use remaining allowance",
    {
      restaurant: z.string().describe("Restaurant ID"),
      item_ids: z.string().describe("Comma-separated item IDs currently in cart"),
      allowance_amount: z.string().describe("Total allowance amount"),
      current_total_spend: z.string().describe("Current total spend"),
      cart_subtotal: z.string().describe("Cart subtotal"),
      platform: z.string().optional().default("GROUP_ORDER").describe("Order platform"),
      order_time_string: z.string().optional().describe("Order time, e.g. 2026-03-12 12:00:00"),
      order_timezone: z.string().optional().describe("IANA timezone"),
      delivery_status: z.string().optional().describe("1 for delivery"),
    },
    async (args) => {
      try {
        const params: Record<string, string> = {};
        for (const [k, v] of Object.entries(args)) {
          if (v !== undefined) params[k] = String(v);
        }
        const result = await apiGet("/restaurants/checkout_item_suggestions", params);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(transform.restaurants.checkoutSuggestions(result), null, 2) },
          ],
        };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    },
  );
}
