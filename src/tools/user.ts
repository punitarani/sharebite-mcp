import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet } from "../api.js";
import { transform } from "../models.js";

export function registerUserTools(server: McpServer) {
  server.tool(
    "get_user_info",
    "Get the current user's complete profile including login status, corporate info, meal allowance/budget, dietary preferences, and credit balance. Call this first at the start of any ordering session. The response includes user_id, approved delivery addresses (with lat/lng/place_id), allowance amounts, and phone number — all needed by downstream tools. Optionally provide future_order_date and group_order to get the allowance for a specific ordering window.",
    {
      timezone: z.string().optional().describe("IANA timezone, e.g. America/New_York"),
      future_order_date: z
        .string()
        .optional()
        .describe("Future order date for allowance context, e.g. 2026-03-12 12:00:00"),
      group_order: z.string().optional().describe("Group order slug for allowance context"),
    },
    async ({ timezone, future_order_date, group_order }) => {
      try {
        // Step 1: login_status first — need user.id for corporate_allowance
        const loginParams: Record<string, string> = {};
        if (timezone) loginParams.timezone = timezone;
        const loginRaw = await apiGet("/users/login_status", loginParams);
        const profile = transform.user.loginStatus(loginRaw);
        const userId = profile?.user?.id;

        // Step 2: parallel fetch the remaining 3
        const allowanceParams: Record<string, string> = {};
        if (userId) allowanceParams.user_id = String(userId);
        if (timezone) allowanceParams.timezone = timezone;
        if (future_order_date) allowanceParams.future_order_date = future_order_date;
        if (group_order) allowanceParams.group_order = group_order;

        const [allowanceRes, selectionsRes, creditsRes] = await Promise.allSettled([
          userId
            ? apiGet("/users/corporate_allowance", allowanceParams).then((r) => transform.user.corporateAllowance(r))
            : Promise.resolve(null),
          apiGet("/users/selections"),
          apiGet("/users/credit_balance/"),
        ]);

        const result = {
          profile,
          allowance: allowanceRes.status === "fulfilled" ? allowanceRes.value : { error: String(allowanceRes.reason) },
          selections:
            selectionsRes.status === "fulfilled" ? selectionsRes.value : { error: String(selectionsRes.reason) },
          credits: creditsRes.status === "fulfilled" ? creditsRes.value : { error: String(creditsRes.reason) },
        };

        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    },
  );
}
