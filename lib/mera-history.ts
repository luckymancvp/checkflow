import { logServerError } from "@/lib/server-sentry"
import type { MeraOrderItem } from "@/types/mera-order"
import type { SupabaseClient } from "@supabase/supabase-js"

export const MERA_SHEET_ID = "__mera__"

interface LogMeraStatusHistoryParams {
  item: MeraOrderItem
  status: string
  changeType: "design_error" | "customer_change" | null
  orderNote: string | null
  createdBy: string
}

/**
 * Ghi 1 row vào order_history cho status change của Mera item.
 * Schema dùng chung với Sheet — phân biệt nguồn bằng google_sheet_id = '__mera__'.
 * order_id (UUID FK) = NULL vì đơn Mera không có row trong bảng `orders` local;
 * định danh đơn business dùng item_id (= Mera item_key).
 */
export async function logMeraStatusHistory(
  supabase: SupabaseClient,
  { item, status, changeType, orderNote, createdBy }: LogMeraStatusHistoryParams
): Promise<void> {
  const { error } = await supabase.from("order_history").insert({
    order_id: null,
    item_id: item.item_key,
    google_sheet_id: MERA_SHEET_ID,
    status,
    order_note: orderNote,
    designer: item.designer?.name || null,
    design_link: item.design_link || null,
    mockup_link: item.mockup_link || null,
    customer_image: item.customer_image || null,
    personalization: item.personalization || null,
    date: null,
    store: null,
    product_image: item.image_link || null,
    product_type: item.product_type || null,
    product_name: item.product_name || null,
    change_type: changeType,
    created_by: createdBy,
    created_at: new Date().toISOString(),
  })

  if (error) {
    logServerError(error as unknown as Error, {
      context: "logMeraStatusHistory",
      item_key: item.item_key,
      status,
    })
  }
}
