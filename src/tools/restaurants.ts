import { z } from "zod";
import { apiGet, apiPost } from "../api.js";
import { transform } from "../models.js";
import type { OwnedToolServer } from "../tool-registry.js";

export function registerRestaurantTools(server: OwnedToolServer) {
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
    "get_restaurant",
    "Get complete information for a restaurant: details (hours, fees, delivery minimums), whether it's currently open, the full menu organized by section, popular items, and the user's previously ordered items. All data is fetched in parallel for a single comprehensive response. When ordering within a group order, provide group_order_id to also check restaurant capacity.",
    {
      restaurant_id: z.string().describe("Restaurant ID"),
      delivery_status: z.string().optional().describe("1 for delivery, 2 for pickup"),
      future_order_date: z.string().optional().describe("Future order date, e.g. 2026-03-12 12:00:00"),
      timezone: z.string().optional().describe("IANA timezone"),
      group_order_slug: z.string().optional().describe("Group order slug for menu context"),
      group_order_id: z
        .string()
        .optional()
        .describe("Numeric group order ID — when provided, also checks restaurant capacity"),
      latitude: z.string().optional().describe("Delivery latitude"),
      longitude: z.string().optional().describe("Delivery longitude"),
    },
    async ({
      restaurant_id,
      delivery_status,
      future_order_date,
      timezone,
      group_order_slug,
      group_order_id,
      latitude,
      longitude,
    }) => {
      try {
        // Build shared query params
        const detailQp: Record<string, string> = {};
        if (latitude) detailQp.latitude = latitude;
        if (longitude) detailQp.longitude = longitude;
        if (future_order_date) detailQp.future_order_date = future_order_date;
        if (timezone) detailQp.timezone = timezone;
        if (delivery_status) detailQp.delivery_status = delivery_status;

        const menuQp: Record<string, string> = { restaurant_id };
        if (delivery_status) menuQp.delivery_status = delivery_status;
        if (future_order_date) menuQp.future_order_date = future_order_date;
        if (timezone) menuQp.timezone = timezone;
        if (group_order_slug) menuQp.group_order_slug = group_order_slug;

        const openQp: Record<string, string> = { restaurant_id, is_delivery: "true" };
        if (timezone) openQp.timezone = timezone;
        if (future_order_date) openQp.future_order_date = future_order_date;

        const popQp: Record<string, string> = {};
        if (delivery_status) popQp.delivery_status = delivery_status;
        if (future_order_date) popQp.future_order_date = future_order_date;

        const prevQp: Record<string, string> = {};
        if (delivery_status) prevQp.delivery_status = delivery_status;
        if (future_order_date) prevQp.future_order_date = future_order_date;

        // Build parallel fetch array
        const fetches: Promise<unknown>[] = [
          apiGet(`/restaurants/${restaurant_id}/detail/`, detailQp), // 0: details
          apiGet("/restaurants/is_rest_open/", openQp), // 1: is_open
          apiGet("/restaurants/menu/", menuQp), // 2: menu
          apiGet(`/restaurants/restaurant_popular_items/${restaurant_id}/`, popQp), // 3: popular
          apiGet(`/users/user_previous_order_items/${restaurant_id}/`, prevQp), // 4: previously_ordered
        ];

        // Optional: capacity check (only when group_order_id provided)
        if (group_order_id) {
          fetches.push(
            apiGet("/grouporder/get_group_order_restaurant_capacity/", {
              restaurant: restaurant_id,
              group_order: group_order_id,
            }),
          ); // 5: capacity
        }

        const results = await Promise.allSettled(fetches);

        const response: Record<string, unknown> = {};
        const transforms: Array<{ key: string; transform?: (raw: any) => any }> = [
          { key: "details", transform: transform.restaurants.details },
          { key: "is_open" },
          { key: "menu", transform: transform.restaurants.menu },
          { key: "popular_items", transform: transform.restaurants.popularItems },
          { key: "previously_ordered", transform: transform.restaurants.previousOrderItems },
        ];
        if (group_order_id) {
          transforms.push({ key: "capacity" });
        }

        transforms.forEach((entry, i) => {
          const res = results[i];
          if (!res) {
            throw new Error(`Missing result at index ${i}`);
          }
          if (res.status === "fulfilled") {
            response[entry.key] = entry.transform ? entry.transform(res.value) : res.value;
          } else {
            response[entry.key] = { error: String(res.reason) };
          }
        });

        return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }] };
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
      group_order_slug: z.string().optional().describe("Group order slug for group order context"),
    },
    async ({ item_id, timezone, future_order_time, group_order_slug }) => {
      try {
        const params: Record<string, string> = {};
        if (timezone) params.timezone = timezone;
        if (future_order_time) params.future_order_time = future_order_time;
        if (group_order_slug) params.group_order_slug = group_order_slug;
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
