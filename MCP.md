# Sharebite MCP Server — Tool Specification

## Overview

This MCP server provides tools for interacting with the Sharebite corporate food ordering platform. It enables AI assistants to browse group orders, search restaurants, view menus, and place orders on behalf of authenticated users.

**Base URL:** Configured via `SHAREBITE_BASE_URL` env var (default: `https://<company>.sharebite.com/api/v1`)

**Authentication:** Cookie-based session auth. The server accepts `sessionid` and `csrftoken` cookies via environment variables.

---

## Tools

### 1. `get_login_status`

Returns the current user's profile, corporate info, and approved addresses. Use this as the first call to confirm auth and retrieve user context (user ID, corporate addresses, location coordinates).

**API:** `GET /users/login_status?timezone={timezone}`

#### Input Schema

| Parameter  | Type   | Required | Default              | Description                    |
|------------|--------|----------|----------------------|--------------------------------|
| `timezone` | string | No       | `America/Los_Angeles`| IANA timezone identifier       |

#### Output Schema (key fields)

```json
{
  "loggedin_status": true,
  "user": {
    "id": 100001,
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "corporate": {
      "name": "string",
      "approved_addresses": [
        {
          "id": 1001,
          "address": "123 Main St, Anytown, ST 10001, USA",
          "floor": "5",
          "city": "string",
          "state": "string",
          "zip_code": "string",
          "timezone": "America/Los_Angeles",
          "lat": "40.7128",
          "lon": "-74.0060",
          "cross_street": "string",
          "delivery_note": "string"
        }
      ]
    }
  }
}
```

---

### 2. `get_this_week_group_orders`

Returns all group orders for the current week, including their restaurants and order capacity info.

**API:** `GET /users/homepage/this-weeks-group-orders/?timezone={timezone}&latitude={latitude}&longitude={longitude}`

#### Input Schema

| Parameter   | Type   | Required | Description                              |
|-------------|--------|----------|------------------------------------------|
| `timezone`  | string | Yes      | IANA timezone (e.g. `America/Los_Angeles`)|
| `latitude`  | number | Yes      | Latitude of delivery address             |
| `longitude` | number | Yes      | Longitude of delivery address            |

#### Output Schema

```json
{
  "count": 5,
  "results": [
    {
      "id": 200001,
      "group_order_no": "string",
      "slug": "string",
      "name": "Wednesday Lunch",
      "restaurants": [
        {
          "id": 300001,
          "name": "Example Restaurant",
          "cuisines": ["Salads"],
          "photo_url": "string",
          "order_cap_info": {
            "max_capacity": 50,
            "current_orders": 30,
            "orders_remaining": 20,
            "status": "",
            "is_at_capacity": false,
            "is_almost_at_capacity": false
          }
        }
      ],
      "status": 1,
      "fulfilment_time": "2026-03-12 12:00:00",
      "order_close_time": "2026-03-12 09:00:00",
      "corporate_address": "string",
      "is_accepting": true,
      "timezone": "America/Los_Angeles"
    }
  ]
}
```

---

### 3. `get_group_order_details`

Returns full details for a specific group order by its slug, including all restaurants, order status, and fulfillment times.

**API:** `GET /grouporder/user_grouporders/?slug={slug}`

#### Input Schema

| Parameter | Type   | Required | Description                     |
|-----------|--------|----------|---------------------------------|
| `slug`    | string | Yes      | Group order slug (hex string)   |

#### Output Schema

```json
{
  "status": 200,
  "data": [
    {
      "id": 200002,
      "group_order_no": "string",
      "slug": "string",
      "name": "Thursday Lunch",
      "restaurants": [
        {
          "id": 300002,
          "name": "Sample Kitchen",
          "cuisines": ["Mediterranean"],
          "at_capacity": "",
          "is_sweetgreen": false
        }
      ],
      "restaurant_ids": [300002, 300003],
      "status": 1,
      "fulfilment_time": "2026-03-12 12:00:00",
      "order_close_time": "2026-03-12 09:00:00",
      "corporate_address": "string",
      "cross_street": "string",
      "floor": "5",
      "is_accepting": true,
      "charge_tip": true,
      "timezone": "America/Los_Angeles",
      "orders": []
    }
  ]
}
```

---

### 4. `get_recent_orders`

Returns the user's recent order history.

**API:** `GET /users/homepage/recent-orders/?order_category={order_category}`

#### Input Schema

| Parameter        | Type   | Required | Default       | Description                             |
|------------------|--------|----------|---------------|-----------------------------------------|
| `order_category` | string | No       | `GROUP_ORDER` | Order type filter (`GROUP_ORDER`, etc.)  |

#### Output Schema

```json
{
  "count": 10,
  "results": [
    {
      "id": 400001,
      "restaurant_type": "GROUP_ORDER",
      "restaurant_photo": "string",
      "order_no": "string",
      "restaurant_id": 300001,
      "restaurant_name": "Example Restaurant",
      "product_total": 19.0,
      "total": 19.0,
      "user_address": "string",
      "item_list": [
        {
          "id": 500001,
          "about": "string",
          "title": "Grilled Chicken Bowl",
          "price": 16.0,
          "quantity": 1,
          "total": 19.0,
          "MenuChoice": [
            {
              "id": 600001,
              "title": "Side Choice",
              "Option": [
                {
                  "id": 700001,
                  "name": "Brown Rice",
                  "price": 3.0
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

---

### 5. `search_restaurants`

Searches restaurants available for a group order. Can filter by specific restaurant IDs or search broadly by location.

**API:** `POST /restaurants/search_restaurant/`

#### Input Schema

| Parameter           | Type   | Required | Description                                        |
|---------------------|--------|----------|----------------------------------------------------|
| `latitude`          | number | Yes      | Latitude of delivery address                       |
| `longitude`         | number | Yes      | Longitude of delivery address                      |
| `timezone`          | string | Yes      | IANA timezone                                      |
| `restaurant_ids`    | string | No       | Comma-separated restaurant IDs to filter           |
| `group_order_slug`  | string | No       | Group order slug to scope the search               |
| `sortby`            | string | No       | Sort field: `best_match`, `rating`, `delivery_time`|
| `sort_order`        | string | No       | `asc` or `desc`                                    |
| `page_num`          | number | No       | Page number (default: 1)                           |
| `page_size`         | number | No       | Results per page (default: 20)                     |
| `delivery_status`   | number | No       | `1` = delivery (default)                           |
| `restaurant_type`   | string | No       | `GROUP_ORDER` (default)                            |

#### Output Schema

```json
{
  "results": [
    {
      "id": 300004,
      "name": "Poke Place",
      "rating": 4.9,
      "photo": "string",
      "delivery_fee": 0.0,
      "order_minimum": 0.0,
      "estimated_delivery_time": "35-55 mins",
      "street": "string",
      "dollar_rating": 1,
      "open_time": "10:00:00",
      "close_time": "21:30:00",
      "cuisines": "Japanese",
      "tag_list": [
        { "name": "Poke", "is_dietary": false },
        { "name": "Gluten Free Options", "is_dietary": true }
      ],
      "latitude": 40.7128,
      "longitude": -74.006,
      "restaurant_type": "GROUP_ORDER",
      "is_preferred": false,
      "is_paused": false
    }
  ]
}
```

---

### 6. `get_restaurant_details`

Returns full details about a specific restaurant including hours, fees, tax rate, and settings.

**API:** `GET /restaurants/{restaurant_id}/detail/?future_order_date={future_order_date}&latitude={latitude}&longitude={longitude}&timezone={timezone}&delivery_status={delivery_status}`

#### Input Schema

| Parameter           | Type   | Required | Description                               |
|---------------------|--------|----------|-------------------------------------------|
| `restaurant_id`     | number | Yes      | Restaurant ID                             |
| `future_order_date` | string | Yes      | Order date (e.g. `2026-03-12 12:00:00`)   |
| `latitude`          | number | Yes      | Delivery address latitude                 |
| `longitude`         | number | Yes      | Delivery address longitude                |
| `timezone`          | string | Yes      | IANA timezone                             |
| `delivery_status`   | number | No       | `1` = delivery (default)                  |

#### Output Schema

```json
{
  "id": 300005,
  "name": "Taco Shop",
  "description": "string",
  "street": "string",
  "rating": 4.8,
  "photo": "string",
  "min_delivery_time": 35,
  "max_delivery_time": 55,
  "estimated_delivery_time": "35-55 mins",
  "delivery": true,
  "delivery_fee": 0.0,
  "open_time": "11:00:00",
  "close_time": "23:59:00",
  "dollar_rating": 1,
  "sales_tax_rate": 8.875,
  "cuisines": "Mexican",
  "phone_number": "string",
  "timings": [
    {
      "day": "Monday",
      "delivery_open_time": "11:00:00",
      "delivery_closed_time": "22:00:00"
    }
  ],
  "tip": {
    "enabled": true,
    "tip_locked": false
  },
  "restaurant_type": "GROUP_ORDER",
  "timezone": "string",
  "cancellation_policy": "string"
}
```

---

### 7. `get_restaurant_menu`

Returns the full menu for a restaurant, organized by sections.

**API:** `GET /restaurants/menu/?restaurant_id={restaurant_id}&delivery_status={delivery_status}&future_order_date={future_order_date}&timezone={timezone}`

#### Input Schema

| Parameter           | Type   | Required | Description                             |
|---------------------|--------|----------|-----------------------------------------|
| `restaurant_id`     | number | Yes      | Restaurant ID                           |
| `future_order_date` | string | Yes      | Order date (e.g. `2026-03-12 12:00:00`) |
| `timezone`          | string | Yes      | IANA timezone                           |
| `delivery_status`   | number | No       | `1` = delivery (default)                |

#### Output Schema

```json
[
  {
    "restaurant_id": 300005,
    "MenuSection": [
      {
        "id": 800001,
        "name": "Starters",
        "description": null,
        "Item": [
          {
            "id": 500002,
            "title": "Chips and Guacamole",
            "about": "string",
            "price": 10.5,
            "photo": "string",
            "choice_exist": true,
            "minimum_serving": 1,
            "maximum_serving_size": null,
            "dietary_tags": []
          }
        ]
      }
    ]
  }
]
```

---

### 8. `get_menu_item_detail`

Returns detailed info for a single menu item including all modifier groups (MenuChoices) and their options.

**API:** `GET /restaurants/item_detail/{item_id}?timezone={timezone}&future_order_time={future_order_time}`

#### Input Schema

| Parameter           | Type   | Required | Description                                  |
|---------------------|--------|----------|----------------------------------------------|
| `item_id`           | number | Yes      | Menu item ID                                 |
| `timezone`          | string | Yes      | IANA timezone                                |
| `future_order_time` | string | Yes      | Order time (e.g. `2026-03-12 12:00:00`)      |

#### Output Schema

```json
{
  "id": 500003,
  "title": "Chicken Bowl",
  "about": "Grilled chicken with rice or salad...",
  "price": 19.0,
  "photo": "string",
  "minimum_serving": 1,
  "maximum_serving_size": null,
  "price_add": true,
  "pre_selected_price": 19.0,
  "MenuChoice": [
    {
      "id": 600002,
      "title": "Base Choice",
      "choice_note": "(Choose 1 item(s))",
      "choices": 1,
      "min_choices": 1,
      "max_choices": 1,
      "Option": [
        {
          "id": 700002,
          "name": "Rice",
          "price": 0.0,
          "description": null,
          "nested_modifiers": [],
          "included": false
        },
        {
          "id": 700003,
          "name": "Salad",
          "price": 0.0
        }
      ]
    }
  ]
}
```

---

### 9. `get_group_order_restaurant_capacity`

Checks order capacity for a restaurant within a specific group order.

**API:** `GET /grouporder/get_group_order_restaurant_capacity/?restaurant={restaurant_id}&group_order={group_order_id}`

#### Input Schema

| Parameter        | Type   | Required | Description                        |
|------------------|--------|----------|------------------------------------|
| `restaurant_id`  | number | Yes      | Restaurant ID                      |
| `group_order_id` | number | Yes      | Group order numeric ID (not slug)  |

#### Output Schema

```json
{
  "restaurant_id": 300005,
  "group_order": 200002,
  "at_capacity": false,
  "capacity_status": ""
}
```

---

### 10. `get_corporate_allowance`

Returns the user's meal allowance/budget for a specific order time and group order.

**API:** `GET /users/corporate_allowance?user_id={user_id}&timezone={timezone}&future_order_date={future_order_date}&group_order={group_order_slug}`

#### Input Schema

| Parameter           | Type   | Required | Description                              |
|---------------------|--------|----------|------------------------------------------|
| `user_id`           | number | Yes      | User ID                                  |
| `timezone`          | string | Yes      | IANA timezone                            |
| `future_order_date` | string | No       | Order date (e.g. `2026-03-12 12:00:00`)  |
| `group_order_slug`  | string | No       | Group order slug                         |

#### Output Schema

```json
{
  "allowance": [
    {
      "name": "Daily Lunch",
      "id": 900001,
      "day": 3,
      "start_time": "09:00:00",
      "end_time": "14:00:00",
      "allowance": 25.0,
      "maximum_applicable_allowance": 25.0,
      "soft_budget": 0.0,
      "expiry": "DAILY",
      "types": [
        {
          "id": 900002,
          "name": "Employee Meal",
          "category_name": "Group Order"
        }
      ]
    }
  ]
}
```

---

### 11. `calculate_order_prices`

Calculates pricing for a cart — subtotal, tax, delivery fee, tip, and grand total. Call this before placing an order to show the user what they'll pay.

**API:** `POST /orders/order_prices/`

#### Input Schema

| Parameter           | Type    | Required | Description                                  |
|---------------------|---------|----------|----------------------------------------------|
| `user_id`           | number  | Yes      | User ID                                      |
| `restaurant_id`     | number  | Yes      | Restaurant ID                                |
| `items`             | array   | Yes      | Cart items (see below)                       |
| `is_delivery`       | boolean | Yes      | `true` for delivery                          |
| `latitude`          | number  | Yes      | Delivery latitude                            |
| `longitude`         | number  | Yes      | Delivery longitude                           |
| `delivery_address`  | string  | Yes      | Full delivery address string                 |
| `future_order_date` | string  | Yes      | Order date                                   |
| `zip_code`          | string  | Yes      | Delivery zip code                            |
| `is_group_order`    | boolean | Yes      | `true` for group orders                      |
| `group_order_slug`  | string  | No       | Group order slug                             |
| `tip_percentage`    | string  | No       | Tip percentage (e.g. `"0.0000"`)             |
| `tip`               | string  | No       | Tip amount (e.g. `"0.0000"`)                 |
| `use_credit`        | boolean | No       | Whether to apply credits                     |

**Items array element:**
```json
{
  "id": 500003,
  "selections": [700002],
  "selection_with_quantity": [
    { "option_id": 700002, "option_quantity": 1 }
  ],
  "quantity": 1,
  "instructions": ""
}
```

#### Output Schema

```json
{
  "subtotal": 19.0,
  "sales_tax": 1.69,
  "corporate_bears_taxes": true,
  "delivery_fee": 0.0,
  "estimated_delivery_time": "35-55 mins",
  "tip": 0.0,
  "grand_total": 19.0,
  "credits_available": 0.0,
  "credits_applied": 0.0,
  "service_fee": 0.0,
  "administrative_fee": 0.0,
  "cc_charge": 0.0,
  "sharebite_service_fee": 0.0
}
```

---

### 12. `place_order`

Places (submits) an order for the authenticated user. This is the checkout action.

**API:** `POST /orders/braintree_purchase`

#### Input Schema

| Parameter                   | Type    | Required | Description                                        |
|-----------------------------|---------|----------|----------------------------------------------------|
| `item_list`                 | array   | Yes      | Cart items (same format as `calculate_order_prices`)|
| `restaurant_id`             | number  | Yes      | Restaurant ID                                      |
| `tip`                       | string  | Yes      | Tip amount (e.g. `"0.00"`)                         |
| `user_address`              | string  | Yes      | Full delivery address                              |
| `user_apt`                  | string  | Yes      | Floor/apartment number                             |
| `user_address_crossstreets` | string  | Yes      | Cross streets                                      |
| `city`                      | string  | Yes      | City                                               |
| `zip_code`                  | string  | Yes      | Zip code                                           |
| `state`                     | string  | Yes      | State abbreviation                                 |
| `lat`                       | number  | Yes      | Delivery latitude                                  |
| `lon`                       | number  | Yes      | Delivery longitude                                 |
| `user_phone`                | string  | Yes      | User phone number                                  |
| `user_place_id`             | string  | Yes      | Google Places ID for the address                   |
| `order_type`                | number  | Yes      | `1` = delivery                                     |
| `is_future_order`           | boolean | Yes      | `true` for scheduled orders                        |
| `future_order_date`         | string  | Yes      | Order date (e.g. `2026-03-12 12:00:00`)            |
| `is_group_order`            | boolean | Yes      | `true` for group orders                            |
| `group_order_slug`          | string  | Yes      | Group order slug                                   |
| `timezone`                  | string  | Yes      | IANA timezone                                      |
| `selected_allowance_type`   | number  | Yes      | Expense type ID (from allowance data)              |
| `product_total`             | number  | Yes      | Subtotal amount                                    |
| `allowance`                 | number  | Yes      | Allowance amount used                              |
| `meal_sharers`              | array   | Yes      | Array of user IDs                                  |
| `meal_allowances`           | array   | Yes      | Array of allowance amounts                         |
| `assigned_floor`            | string  | Yes      | Delivery floor                                     |
| `skip_utensils`             | boolean | No       | Skip utensils (default: `true`)                    |
| `instructions`              | string  | No       | Delivery instructions                              |
| `credits`                   | number  | No       | Credits to use (default: `0`)                      |
| `recommendation_id`         | number  | No       | Upsell recommendation ID if applicable             |

#### Output Schema

```json
{
  "msg": "payment success full",
  "order": {
    "id": 400002,
    "restaurant_type": "GROUP_ORDER",
    "order_no": "string",
    "restaurant_id": 300002,
    "restaurant_name": "Sample Kitchen",
    "product_total": 19.0,
    "tip": 0.0,
    "tax": 1.69,
    "total": 19.0,
    "user_address": "string",
    "item_list": [
      {
        "id": 500003,
        "title": "Chicken Bowl",
        "price": 19.0,
        "quantity": 1,
        "total": 19.0,
        "MenuChoice": []
      }
    ]
  }
}
```

---

### 13. `get_restaurant_popular_items`

Returns popular menu items for a restaurant.

**API:** `GET /restaurants/restaurant_popular_items/{restaurant_id}/?delivery_status={delivery_status}&future_order_date={future_order_date}`

#### Input Schema

| Parameter           | Type   | Required | Description                             |
|---------------------|--------|----------|-----------------------------------------|
| `restaurant_id`     | number | Yes      | Restaurant ID                           |
| `future_order_date` | string | Yes      | Order date (e.g. `2026-03-12 12:00:00`) |
| `delivery_status`   | number | No       | `1` = delivery (default)                |

#### Output Schema

```json
[
  {
    "id": 500004,
    "name": "Burrito",
    "description": "Choice of protein, wrapped in a flour tortilla...",
    "price": 11.95,
    "restaurant_id": 300005,
    "restaurant_name": "Taco Shop",
    "image_url": "string",
    "dietary_tags": []
  }
]
```

---

### 14. `get_group_order_popular_items`

Returns popular items across all restaurants in a group order.

**API:** `GET /grouporder/group_order_popular_items/{group_order_id}/?delivery_status={delivery_status}&future_order_date={future_order_date}&timezone={timezone}`

#### Input Schema

| Parameter           | Type   | Required | Description                             |
|---------------------|--------|----------|-----------------------------------------|
| `group_order_id`    | number | Yes      | Group order numeric ID                  |
| `future_order_date` | string | Yes      | Order date                              |
| `timezone`          | string | Yes      | IANA timezone                           |
| `delivery_status`   | number | No       | `1` = delivery (default)                |

#### Output Schema

```json
[
  {
    "id": 500005,
    "name": "Super Bowl",
    "description": "string",
    "price": "21.95",
    "restaurant_id": 300004,
    "restaurant_name": "Poke Place",
    "image_url": "string"
  }
]
```

---

### 15. `get_user_previous_order_items`

Returns items the user has previously ordered from a specific restaurant.

**API:** `GET /users/user_previous_order_items/{restaurant_id}/?delivery_status={delivery_status}&future_order_date={future_order_date}`

#### Input Schema

| Parameter           | Type   | Required | Description                             |
|---------------------|--------|----------|-----------------------------------------|
| `restaurant_id`     | number | Yes      | Restaurant ID                           |
| `future_order_date` | string | Yes      | Order date                              |
| `delivery_status`   | number | No       | `1` = delivery (default)                |

#### Output Schema

```json
[
  {
    "id": 500006,
    "image_url": "string",
    "item_name": "Burrito Bowl",
    "item_price": 11.95,
    "order_item_selection_list": {
      "id": 500006,
      "title": "Burrito Bowl",
      "price": 11.95,
      "quantity": 1,
      "total": 14.95,
      "MenuChoice": []
    }
  }
]
```

---

### 16. `validate_delivery_address`

Validates that a restaurant delivers to a given address.

**API:** `POST /orders/validate_delivery_address/`

#### Input Schema

| Parameter    | Type   | Required | Description                 |
|--------------|--------|----------|-----------------------------|
| `address`    | string | Yes      | Full delivery address       |
| `restaurant` | number | Yes      | Restaurant ID               |

#### Output Schema

```json
{
  "valid_delivery_address": [300002],
  "lat": "40.7128",
  "long": "-74.0060"
}
```

---

### 17. `check_restaurant_open`

Checks if a restaurant is currently open for orders at a given time.

**API:** `GET /restaurants/is_rest_open/?restaurant_id={restaurant_id}&is_delivery={is_delivery}&timezone={timezone}&future_order_date={future_order_date}`

#### Input Schema

| Parameter           | Type    | Required | Description                             |
|---------------------|---------|----------|-----------------------------------------|
| `restaurant_id`     | number  | Yes      | Restaurant ID                           |
| `timezone`          | string  | Yes      | IANA timezone                           |
| `future_order_date` | string  | Yes      | Order date                              |
| `is_delivery`       | boolean | No       | `true` for delivery (default)           |

#### Output Schema

```json
{
  "is_open": true,
  "msg": null,
  "restaurant_id": "300002",
  "future_order_buffer_valid": true,
  "rest_open_time": "08:00:00",
  "rest_close_time": "22:00:00",
  "next_available_day": "03/12/2026"
}
```

---

### 18. `get_user_credit_balance`

Returns the user's available credit balance.

**API:** `GET /users/credit_balance/`

#### Input Schema

None.

#### Output Schema

```json
{
  "balance": 0.0,
  "has_expiring_credits": false,
  "expiring_credits": [],
  "lifetime_rewards": 0
}
```

---

### 19. `get_user_selections`

Returns the user's saved preferences (selected address, charity, credit card).

**API:** `GET /users/selections`

#### Input Schema

None.

#### Output Schema

```json
{
  "data": {
    "user_id": 100001,
    "id": 110001,
    "selected_address": "string",
    "selected_charity": "string",
    "selected_credit_card": null,
    "selected_expense_type": null
  }
}
```

---

### 20. `get_checkout_item_suggestions`

Returns upsell/add-on item suggestions during checkout to help the user maximize their allowance.

**API:** `GET /restaurants/checkout_item_suggestions?platform={platform}&allowance_amount={allowance_amount}&current_total_spend={current_total_spend}&cart_subtotal={cart_subtotal}&restaurant={restaurant_id}&item_ids={item_ids}&order_time_string={order_time_string}&order_timezone={timezone}`

#### Input Schema

| Parameter             | Type   | Required | Description                                  |
|-----------------------|--------|----------|----------------------------------------------|
| `restaurant_id`       | number | Yes      | Restaurant ID                                |
| `allowance_amount`    | number | Yes      | User's meal allowance                        |
| `current_total_spend` | number | Yes      | Current cart subtotal                         |
| `cart_subtotal`       | number | Yes      | Cart subtotal (same as current_total_spend)   |
| `item_ids`            | string | Yes      | Comma-separated item IDs in cart             |
| `order_time_string`   | string | Yes      | Order time                                   |
| `timezone`            | string | Yes      | IANA timezone                                |
| `platform`            | string | No       | `GROUP_ORDER` (default)                      |

#### Output Schema

```json
{
  "items": [
    {
      "id": 500007,
      "title": "Fries",
      "about": "Crispy golden fries...",
      "price": 4.0,
      "photo": "string",
      "restaurant_id": 300002,
      "dietary_tags": []
    }
  ],
  "recommendation_id": 120001
}
```

---

## Typical Workflow

1. **`get_login_status`** — Confirm auth, get user ID, approved addresses with lat/lng
2. **`get_this_week_group_orders`** — Show available group orders for the week
3. **`get_group_order_details`** — Get details for a chosen group order (slug → ID, restaurants, times)
4. **`get_group_order_restaurant_capacity`** — Check if the desired restaurant has capacity
5. **`get_restaurant_menu`** — Browse the menu
6. **`get_menu_item_detail`** — Get modifier options for a selected item
7. **`get_corporate_allowance`** — Check the user's budget
8. **`calculate_order_prices`** — Preview pricing before checkout
9. **`place_order`** — Submit the order

### Alternative discovery flows:
- **`search_restaurants`** — Search for restaurants in a group order
- **`get_restaurant_popular_items`** / **`get_group_order_popular_items`** — Browse popular items
- **`get_user_previous_order_items`** — Reorder from past favorites
- **`get_checkout_item_suggestions`** — Upsell to fill remaining allowance
