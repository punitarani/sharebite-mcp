# sharebite-mcp

MCP server for the Sharebite corporate food ordering API. Exposes 20 tools for browsing group orders, searching restaurants, viewing menus, and placing orders.

## Quick Start

```bash
bun install
```

### 1. Set up authentication

Log in to [\<company\>.sharebite.com](https://<company>.sharebite.com), open DevTools → Application → Cookies, and copy the cookie string.

```bash
bun run setup
# Paste your cookie string when prompted
```

Or pass it directly:

```bash
bun run setup --cookie "sessionid=abc123; csrftoken=xyz"
```

This writes `SHAREBITE_SESSION_ID` to `.env`.

### 2. Run the server

**STDIO (default, for MCP clients like Claude Code):**

```bash
bun run start
```

**HTTP transport:**

```bash
bun run start:http
# Listens on http://localhost:3001/mcp
```

## Claude Code MCP Config

Add to your Claude Code MCP settings:

```json
{
  "mcpServers": {
    "sharebite": {
      "command": "bun",
      "args": ["run", "src/index.ts"],
      "cwd": "/path/to/sharebite-mcp"
    }
  }
}
```

## Tool ownership

Every tool is published with the owning team in MCP metadata under
`io.joinhandshake/owning-team`. Sharebite tool ownership is currently
`workplace-experience`. New tool modules must use `OwnedToolServer`, which
requires a non-empty owning team and prevents registering tools without that metadata.

Run `bun run check` locally or in CI to verify both types and the ownership-registration boundary.

## Tools

| Tool | Description |
|------|-------------|
| `get_login_status` | Current user profile and corporate info |
| `get_corporate_allowance` | Meal allowance/budget |
| `get_user_selections` | Saved dietary preferences |
| `get_user_credit_balance` | Credit balance |
| `get_this_week_group_orders` | This week's group orders |
| `get_group_order_details` | Group order details by slug |
| `get_group_order_restaurant_capacity` | Restaurant capacity in a group order |
| `get_group_order_popular_items` | Popular items for a group order |
| `search_restaurants` | Search available restaurants |
| `get_restaurant_details` | Restaurant details |
| `get_restaurant_menu` | Full menu with categories and prices |
| `get_menu_item_detail` | Item details with options/modifiers |
| `get_restaurant_popular_items` | Popular items at a restaurant |
| `check_restaurant_open` | Check if restaurant is open |
| `get_user_previous_order_items` | Previously ordered items |
| `get_checkout_item_suggestions` | Suggestions to use remaining allowance |
| `get_recent_orders` | Recent order history |
| `calculate_order_prices` | Preview order costs |
| `validate_delivery_address` | Check if address is deliverable |
| `place_order` | Place an order (charges allowance) |
