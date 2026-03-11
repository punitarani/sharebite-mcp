import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet } from "../api.js";
import { transform } from "../models.js";

export function registerGroupOrderTools(server: McpServer) {
  server.tool(
    "get_group_orders",
    "Get this week's available group orders for a delivery location. Returns each group order's schedule, restaurants, and status. Optionally provide a slug to also get full details and popular items across all restaurants for a specific group order — this is the natural next step after the user picks a group order from the list.",
    {
      latitude: z.string().describe("Delivery latitude"),
      longitude: z.string().describe("Delivery longitude"),
      timezone: z.string().describe("IANA timezone, e.g. America/New_York"),
      slug: z.string().optional().describe("Group order slug — enriches response with details and popular items"),
      delivery_status: z.string().optional().describe("1 for delivery (default), 2 for pickup"),
      future_order_date: z.string().optional().describe("Future order date, e.g. 2026-03-12 12:00:00"),
    },
    async ({ latitude, longitude, timezone, slug, delivery_status, future_order_date }) => {
      try {
        const response: Record<string, any> = {};

        // Always fetch this week's group orders
        const thisWeekPromise = apiGet("/users/homepage/this-weeks-group-orders/", {
          timezone,
          latitude,
          longitude,
        }).then((r) => transform.groupOrders.thisWeek(r));

        if (slug) {
          // Fetch details in parallel with this_week
          const detailsPromise = apiGet("/grouporder/user_grouporders/", { slug }).then((r) =>
            transform.groupOrders.details(r),
          );

          const [thisWeekRes, detailsRes] = await Promise.allSettled([thisWeekPromise, detailsPromise]);

          response.this_week =
            thisWeekRes.status === "fulfilled" ? thisWeekRes.value : { error: String(thisWeekRes.reason) };
          response.details =
            detailsRes.status === "fulfilled" ? detailsRes.value : { error: String(detailsRes.reason) };

          // Chain: resolve numeric group_order_id from details → fetch popular items
          if (detailsRes.status === "fulfilled") {
            const goId = detailsRes.value?.data?.[0]?.id;
            if (goId) {
              try {
                const popParams: Record<string, string> = {};
                if (delivery_status) popParams.delivery_status = delivery_status;
                if (future_order_date) popParams.future_order_date = future_order_date;
                if (timezone) popParams.timezone = timezone;
                const popRaw = await apiGet(`/grouporder/group_order_popular_items/${goId}/`, popParams);
                response.popular_items = transform.groupOrders.popularItems(popRaw);
              } catch (e: unknown) {
                response.popular_items = { error: String(e) };
              }
            }
          }
        } else {
          // No slug — just this week's listing
          try {
            response.this_week = await thisWeekPromise;
          } catch (e: unknown) {
            response.this_week = { error: String(e) };
          }
        }

        return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    },
  );
}
