import type { Order } from "@/types/order"
import type { MeraOrder, MeraOrderItem } from "@/types/mera-order"

// Mera status → CheckFlow display status
// CheckFlow status set is a subset; unmapped statuses pass through as-is
const STATUS_MAP: Record<string, Order["status"]> = {
  DESIGNING: "DESIGNED",
  CONFIRMED: "CONFIRMED",
  NEED_REPAIR: "NEED_REPAIR",
  REPAIRED: "REPAIRED",
  DESIGNED: "DESIGNED",
}

function mapStatus(meraStatus: string): Order["status"] {
  return STATUS_MAP[meraStatus] ?? ("DESIGNED" as Order["status"])
}

// Mera orders with is_split_items use item-level fields for per-item data.
// For orders without split, use order-level fields as fallback.
function pickItem(order: MeraOrder): MeraOrderItem | undefined {
  return order.items?.[0]
}

export function adaptMeraOrder(order: MeraOrder): Order & { _mera: MeraOrder } {
  const item = pickItem(order)

  return {
    // Core identity — use order_id as itemId (no sheetId concept in Mera)
    itemId: order.order_id,
    sheetId: "__mera__",

    status: mapStatus(item?.status ?? order.status),
    orderNote: order.note || undefined,
    designer: order.designer?.name || item?.designer?.name || undefined,
    designLink: item?.design_link || undefined,
    mockup: item?.mockup_link || order.mockup_link || undefined,
    customerImage: item?.customer_image || undefined,
    personalization: item?.personalization || undefined,
    date: order.created_at,
    store: order.store || undefined,
    productImage: item?.image_link || undefined,
    productType: item?.product_type || undefined,
    productName: item?.product_name || undefined,
    country: order.shipping?.country || undefined,

    // No row position in Mera
    rowPosition: undefined,

    // Attach original Mera data for mutations (version, item_key, etc.)
    _mera: order,
  }
}

export function adaptMeraOrders(orders: MeraOrder[]): Array<Order & { _mera: MeraOrder }> {
  return orders.map(adaptMeraOrder)
}
