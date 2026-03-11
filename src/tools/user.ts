import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet } from "../api.js";
import { transform } from "../models.js";

export function registerUserTools(server: McpServer) {
  server.tool(
    "get_login_status",
    "Get the current user's login status, profile info, and corporate details",
    { timezone: z.string().optional().describe("IANA timezone, e.g. America/Los_Angeles") },
    async ({ timezone }) => {
      try {
        const params: Record<string, string> = {};
        if (timezone) params.timezone = timezone;
        const result = await apiGet("/users/login_status", params);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(transform.user.loginStatus(result), null, 2) }],
        };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    },
  );

  server.tool(
    "get_corporate_allowance",
    "Get the user's corporate meal allowance (budget) for ordering",
    {
      user_id: z.string().describe("User ID"),
      timezone: z.string().optional().describe("IANA timezone"),
      future_order_date: z.string().optional().describe("Future order date, e.g. 2026-03-12 12:00:00"),
      group_order: z.string().optional().describe("Group order slug"),
    },
    async ({ user_id, timezone, future_order_date, group_order }) => {
      try {
        const params: Record<string, string> = { user_id };
        if (timezone) params.timezone = timezone;
        if (future_order_date) params.future_order_date = future_order_date;
        if (group_order) params.group_order = group_order;
        const result = await apiGet("/users/corporate_allowance", params);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(transform.user.corporateAllowance(result), null, 2) },
          ],
        };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    },
  );

  server.tool(
    "get_user_selections",
    "Get the user's saved selections/preferences (dietary, allergies, etc.)",
    {},
    async () => {
      try {
        const result = await apiGet("/users/selections");
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    },
  );

  server.tool("get_user_credit_balance", "Get the user's credit balance", {}, async () => {
    try {
      const result = await apiGet("/users/credit_balance/");
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (e: unknown) {
      return { content: [{ type: "text" as const, text: String(e) }], isError: true };
    }
  });
}
