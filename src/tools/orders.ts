import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPost } from "../api.js";
import { transform } from "../models.js";

const OrderItemSchema = z.object({
  id: z.number().describe("Menu item ID"),
  selections: z.array(z.number()).optional().describe("Array of selected option IDs"),
  selection_with_quantity: z
    .array(
      z.object({
        option_id: z.number().describe("Option ID"),
        option_quantity: z.number().describe("Quantity for this option"),
      }),
    )
    .optional()
    .describe("Options with quantities"),
  quantity: z.number().describe("Item quantity"),
  instructions: z.string().optional().default("").describe("Special instructions for this item"),
});

export function registerOrderTools(server: McpServer) {
  server.tool(
    "get_recent_orders",
    "Get the user's recent orders",
    {
      order_category: z.string().optional().default("GROUP_ORDER").describe("Order category filter"),
    },
    async ({ order_category }) => {
      try {
        const result = await apiGet("/users/homepage/recent-orders/", {
          order_category,
        });
        return { content: [{ type: "text" as const, text: JSON.stringify(transform.orders.recent(result), null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    },
  );

  server.tool(
    "calculate_order_prices",
    "Calculate prices (subtotal, tax, fees, tip) for a potential order. Use this before placing an order to preview costs.",
    {
      user: z.number().describe("User ID"),
      items: z.array(OrderItemSchema).describe("Items to order"),
      restaurant_id: z.string().describe("Restaurant ID"),
      is_delivery: z.boolean().optional().default(true),
      lat: z.number().describe("Delivery latitude"),
      lng: z.number().describe("Delivery longitude"),
      delivery_address: z.string().describe("Full delivery address"),
      future_order_date: z.string().optional().describe("Future order date, e.g. 2026-03-12 12:00:00"),
      use_credit: z.boolean().optional().default(false),
      tip_percentage: z.string().optional().default("0.0000"),
      tip: z.string().optional().default("0.0000"),
      is_group_order: z.boolean().optional().default(true),
      group_order_slug: z.string().optional().describe("Group order slug"),
      zip_code: z.string().optional().describe("Delivery zip code"),
      credits_used: z.number().optional().default(0),
      allowance: z.number().optional().default(0),
    },
    async (args) => {
      try {
        const result = await apiPost("/orders/order_prices/", args);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    },
  );

  server.tool(
    "validate_delivery_address",
    "Validate that a delivery address is serviceable by a restaurant",
    {
      address: z.string().describe("Full delivery address"),
      restaurant: z.number().describe("Restaurant ID"),
    },
    async (args) => {
      try {
        const result = await apiPost("/orders/validate_delivery_address/", args);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    },
  );

  server.tool(
    "place_order",
    "Place an order via Braintree. This is the final step — make sure to calculate_order_prices first. WARNING: This will charge your account/allowance.",
    {
      item_list: z.array(OrderItemSchema).describe("Items to order"),
      restaurant_id: z.number().describe("Restaurant ID"),
      user_id: z.number().optional().describe("User ID for meal_sharers"),
      tip: z.string().optional().default("0.00").describe("Tip amount"),
      user_address: z.string().describe("Full delivery address"),
      user_apt: z.string().optional().default("").describe("Apartment/suite number"),
      user_address_crossstreets: z.string().optional().default("").describe("Cross streets"),
      city: z.string().describe("City"),
      zip_code: z.string().describe("Zip code"),
      lat: z.number().describe("Delivery latitude"),
      lon: z.number().describe("Delivery longitude"),
      state: z.string().describe("State abbreviation, e.g. CA"),
      user_phone: z.string().describe("Contact phone number"),
      instructions: z.string().optional().default("").describe("Delivery instructions"),
      total: z.number().optional().default(0).describe("Total out-of-pocket amount (0 if fully covered by allowance)"),
      order_type: z.number().optional().default(1).describe("1 for delivery"),
      is_future_order: z.boolean().optional().default(true),
      future_order_date: z.string().optional().describe("Future order date, e.g. 2026-03-12 12:00:00"),
      is_group_order: z.boolean().optional().default(true),
      group_order_slug: z.string().optional().describe("Group order slug"),
      timezone: z.string().optional().describe("IANA timezone"),
      allowance: z.number().optional().default(0).describe("Allowance amount to apply"),
      selected_allowance_type: z.number().optional().describe("Allowance type ID"),
      product_total: z.number().optional().describe("Product subtotal"),
      skip_utensils: z.boolean().optional().default(true),
      saved_payment_token: z
        .string()
        .nullable()
        .optional()
        .default(null)
        .describe("Saved payment token, null if using allowance"),
      user_place_id: z.string().optional().describe("Google Place ID for the delivery address"),
      pickup_location: z.string().optional().default(""),
      is_cafeteria_delivery: z.boolean().optional().default(false),
      order_note: z.string().optional().default(""),
      is_firm_order: z.boolean().optional().default(true),
      floor: z.string().optional().default(""),
      assigned_floor: z.string().optional().default(""),
      should_override_preferred_phone: z.boolean().optional().default(true),
    },
    async (args) => {
      try {
        const { user_id, ...rest } = args;
        const body = {
          ...rest,
          meal_sharers: user_id ? [user_id] : [],
          meal_allowances: args.allowance ? [args.allowance] : [],
          expense_code: [""],
          meal_billables: "",
          totalPages: 1,
          headcount: 0,
          total_budget: "0.00",
          secondary_contacts: [],
          catering_host_details: {},
          credits: 0,
          service_fee: 0,
          administrative_fee: 0,
          override_department: {},
          override_legal_entity: {},
        };
        const result = await apiPost("/orders/braintree_purchase", body);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    },
  );
}
