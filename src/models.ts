// Response transformation layer — strips raw Sharebite API responses
// down to only the fields needed for AI food-ordering workflows.

function pick<T extends Record<string, any>>(obj: T, keys: string[]): Partial<T> {
  if (!obj || typeof obj !== "object") return {} as Partial<T>;
  const out: any = {};
  for (const k of keys) {
    if (k in obj) out[k] = obj[k];
  }
  return out;
}

const POPULAR_ITEM_FIELDS = [
  "id",
  "name",
  "title",
  "description",
  "about",
  "price",
  "image_url",
  "photo",
  "restaurant_id",
  "restaurant_name",
  "dietary_tags",
];

function pickPopularItems(raw: any): any {
  if (Array.isArray(raw)) {
    return raw.map((item: any) => pick(item, POPULAR_ITEM_FIELDS));
  }
  if (raw && typeof raw === "object" && Array.isArray(raw.results)) {
    return {
      ...pick(raw, ["count"]),
      results: raw.results.map((item: any) => pick(item, POPULAR_ITEM_FIELDS)),
    };
  }
  return raw;
}

export const transform = {
  user: {
    loginStatus(raw: any): any {
      if (!raw || typeof raw !== "object") return raw;

      const user = raw.user;
      if (!user) return { loggedin_status: raw.loggedin_status };

      const approvedAddresses = (user.corporate?.approved_addresses ?? []).map((a: any) =>
        pick(a, [
          "id",
          "address",
          "city",
          "state",
          "zip_code",
          "floor",
          "cross_street",
          "timezone",
          "lat",
          "lon",
          "place_id",
        ]),
      );

      const allowanceTimings = (user.allowance_timings ?? []).map((at: any) => ({
        ...pick(at, [
          "name",
          "amount",
          "expiry",
          "refresh_date",
          "current_day_balance",
          "remaining_total_balance",
          "available_today",
        ]),
        timings: (at.timings ?? []).map((t: any) => pick(t, ["day", "start_time", "end_time"])),
        types: (at.types ?? []).map((t: any) => pick(t, ["id", "name", "category_name"])),
      }));

      return {
        loggedin_status: raw.loggedin_status,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          preferred_phone_num: user.preferred_phone_num,
          corporate: user.corporate ? { name: user.corporate.name, approved_addresses: approvedAddresses } : undefined,
          allowance_timings: allowanceTimings,
          dept: user.dept ? { name: user.dept.name } : undefined,
        },
      };
    },

    corporateAllowance(raw: any): any {
      if (!raw || typeof raw !== "object") return raw;

      const allowance = (raw.allowance ?? []).map((a: any) => ({
        ...pick(a, [
          "name",
          "id",
          "allowance",
          "start_time",
          "end_time",
          "day",
          "is_overtime",
          "maximum_applicable_allowance",
          "expiry",
        ]),
        types: (a.types ?? []).map((t: any) => pick(t, ["id", "name", "category_name"])),
      }));

      return { allowance };
    },
  },

  groupOrders: {
    thisWeek(raw: any): any {
      if (!raw || typeof raw !== "object") return raw;

      const results = (raw.results ?? []).map((go: any) => ({
        ...pick(go, [
          "id",
          "group_order_no",
          "slug",
          "name",
          "fulfilment_time",
          "order_open_datetime",
          "order_close_datetime",
          "is_accepting",
          "timezone",
          "corporate_address",
          "floor",
          "status",
        ]),
        restaurants: (go.restaurants ?? []).map((r: any) => pick(r, ["id", "name", "cuisines", "order_cap_info"])),
        orders: (go.orders ?? []).map((o: any) =>
          pick(o, ["id", "orderer_name", "restaurant_name", "order_product_total", "is_order_cancelled"]),
        ),
      }));

      return { count: raw.count, results };
    },

    details(raw: any): any {
      if (!raw || typeof raw !== "object") return raw;

      const data = (raw.data ?? []).map((go: any) => ({
        ...pick(go, [
          "id",
          "group_order_no",
          "slug",
          "name",
          "fulfilment_time",
          "order_close_time",
          "is_accepting",
          "corporate_address",
          "cross_street",
          "floor",
          "timezone",
          "status",
          "non_sponsored",
          "charge_tip",
          "order_cancellation_cutoff_time",
          "restaurant_ids",
        ]),
        restaurants: (go.restaurants ?? []).map((r: any) => pick(r, ["id", "name", "cuisines", "at_capacity"])),
      }));

      return { data };
    },

    popularItems: pickPopularItems,
  },

  restaurants: {
    search(raw: any): any {
      if (!raw || typeof raw !== "object") return raw;

      const results = (raw.results ?? []).map((r: any) => ({
        ...pick(r, [
          "id",
          "name",
          "cuisines",
          "rating",
          "star_rating",
          "dollar_rating",
          "delivery_fee",
          "order_minimum",
          "estimated_delivery_time",
          "photo",
          "is_preferred",
        ]),
        tag_list: (r.tag_list ?? []).map((t: any) => (typeof t === "string" ? { name: t } : pick(t, ["name"]))),
      }));

      return {
        total_restaurants: raw.total_restaurants,
        total_pages: raw.total_pages,
        current_page: raw.current_page,
        results,
      };
    },

    details(raw: any): any {
      if (!raw || typeof raw !== "object") return raw;

      const base = pick(raw, [
        "id",
        "name",
        "description",
        "street",
        "cuisines",
        "phone_number",
        "rating",
        "star_rating",
        "dollar_rating",
        "photo",
        "delivery",
        "pickup",
        "delivery_fee",
        "order_minimum",
        "estimated_delivery_time",
        "estimated_pickup_time",
        "open_time",
        "close_time",
        "timings",
        "tip",
        "sales_tax_rate",
        "hide_utensils_on_checkout",
        "cancellation_policy",
      ]);

      for (const feeKey of ["service_fee", "administrative_fee"] as const) {
        const fee = (raw as any)[feeKey];
        if (fee && typeof fee === "object") {
          (base as any)[feeKey] = pick(fee, ["enabled", "label"]);
        }
      }

      return base;
    },

    menu(raw: any): any {
      if (!Array.isArray(raw)) return raw;

      return raw.flatMap((restaurant: any) => {
        const sections = restaurant.MenuSection;
        if (!Array.isArray(sections)) return [];
        return sections.map((ms: any) => ({
          MenuSection: {
            ...pick(ms, ["id", "name", "description"]),
            Item: (ms.Item ?? []).map((item: any) =>
              pick(item, ["id", "title", "about", "price", "photo", "choice_exist", "dietary_tags"]),
            ),
          },
        }));
      });
    },

    menuItemDetail(raw: any): any {
      if (!raw || typeof raw !== "object") return raw;

      return {
        ...pick(raw, ["id", "title", "about", "price", "photo"]),
        MenuChoice: (raw.MenuChoice ?? []).map((mc: any) => ({
          ...pick(mc, ["id", "title", "min_choices", "max_choices"]),
          Option: (mc.Option ?? []).map((opt: any) =>
            pick(opt, ["id", "name", "price", "description", "min_selection", "max_selection"]),
          ),
        })),
      };
    },

    popularItems: pickPopularItems,

    previousOrderItems(raw: any): any {
      if (!Array.isArray(raw)) return raw;
      return raw.map((item: any) =>
        pick(item, ["id", "item_name", "item_price", "image_url", "dietary_tags", "order_item_selection_list"]),
      );
    },

    checkoutSuggestions(raw: any): any {
      if (!raw || typeof raw !== "object") return raw;
      return {
        recommendation_id: raw.recommendation_id,
        items: (raw.items ?? []).map((item: any) =>
          pick(item, ["id", "title", "about", "price", "photo", "choice_exist", "restaurant_id"]),
        ),
      };
    },
  },

  orders: {
    recent(raw: any): any {
      if (!raw || typeof raw !== "object") return raw;

      const results = (raw.results ?? []).map((o: any) => ({
        ...pick(o, [
          "id",
          "order_no",
          "restaurant_id",
          "restaurant_name",
          "product_total",
          "total",
          "future_order_date",
          "is_group_order",
          "group_order_slug",
          "group_order_name",
          "category",
          "skip_utensils",
        ]),
        item_list: (o.item_list ?? []).map((item: any) => pick(item, ["id", "title", "price", "quantity", "total"])),
      }));

      return { count: raw.count, results };
    },
  },
};
