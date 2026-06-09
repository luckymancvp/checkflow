import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, unauthorizedResponse } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase"
import { logServerError, logServerInfo } from "@/lib/server-sentry"
import { meraClient } from "@/lib/mera-client"
import type { MeraOrder } from "@/types/mera-order"
import { getDateRange } from "@/lib/time-range"

const MERA_SHEET_ID = "__mera__"
const MERA_PAGE_SIZE = 500
const MERA_MAX_PAGES = 20

async function fetchAllMeraOrders(
  actor: { id: string; email: string },
  params: Parameters<typeof meraClient.listOrders>[1],
): Promise<MeraOrder[]> {
  const all: MeraOrder[] = []
  for (let page = 1; page <= MERA_MAX_PAGES; page++) {
    const res = await meraClient.listOrders(actor, {
      ...params,
      page,
      page_size: MERA_PAGE_SIZE,
      include_items: true,
    })
    const orders = res.orders ?? []
    all.push(...orders)
    // Dừng khi: hết trang (theo total_pages nếu API trả về) HOẶC page hiện tại chưa đầy.
    // Tránh silent-miss nếu total_pages = null/0/undefined.
    if (res.total_pages != null && page >= res.total_pages) break
    if (orders.length < MERA_PAGE_SIZE) break
  }
  return all
}

export async function GET(request: NextRequest) {
  try {
    const appUser = await authenticateRequest(request)
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)

    const timeRange = searchParams.get("timeRange") || "all_time"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    // sheetIds: CSV list of google_sheet_id để lọc theo các sheet cụ thể. Rỗng = tất cả.
    const sheetIdsParam = searchParams.get("sheetIds") || ""
    const sheetIds = sheetIdsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    // currentStatuses: CSV list of status. Khi có giá trị → chỉ giữ đơn HIỆN ĐANG ở status đó.
    // Rỗng = không lọc theo trạng thái hiện tại.
    const currentStatusesParam = searchParams.get("currentStatuses") || ""
    const currentStatuses = currentStatusesParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    // projectIds: CSV list of Mera project ID. Filter cho phần data Mera. Rỗng = tất cả project.
    const projectIdsParam = searchParams.get("projectIds") || ""
    const projectIds = projectIdsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    // includeMera / includeSheet: true/false (mặc định true cả 2). Để user có thể tắt 1 nguồn.
    const includeMera = (searchParams.get("includeMera") ?? "true") === "true"
    const includeSheet = (searchParams.get("includeSheet") ?? "true") === "true"

    const applySheetFilter = (q: any): any => {
      if (sheetIds.length > 0) return q.in("google_sheet_id", sheetIds)
      return q
    }

    // Filter cho query order_history (chung cho cả Sheet & Mera).
    // Mera dùng google_sheet_id = '__mera__' nên cùng schema.
    const applySourceFilter = (q: any): any => {
      if (includeSheet && includeMera) {
        if (sheetIds.length > 0) return q.in("google_sheet_id", [...sheetIds, MERA_SHEET_ID])
        return q
      }
      if (includeSheet) {
        if (sheetIds.length > 0) return q.in("google_sheet_id", sheetIds)
        return q.neq("google_sheet_id", MERA_SHEET_ID)
      }
      if (includeMera) return q.eq("google_sheet_id", MERA_SHEET_ID)
      // cả 2 đều tắt — trả query rỗng bằng filter impossible
      return q.eq("google_sheet_id", "__none__")
    }

    const dateRange = getDateRange(timeRange, startDate, endDate)

    // === Query order_history cho cả Sheet & Mera (Mera log qua /api/mera/* PATCH) ===
    let repairDataRaw: any[] | null = []
    let error: any = null
    {
      let query = supabase
        .from("order_history")
        .select(`
          id,
          item_id,
          google_sheet_id,
          designer,
          change_type,
          created_at,
          product_type,
          order_note,
          users!created_by(email)
        `)
        .eq("status", "NEED REPAIR")
      query = applySourceFilter(query)

      if (dateRange) {
        query = query.gte("created_at", dateRange.start.toISOString()).lt("created_at", dateRange.end.toISOString())
      }

      const result = await query.order("created_at", { ascending: false })
      repairDataRaw = result.data as any[]
      error = result.error
    }

    // Nếu có currentStatuses → lấy map (item_id, google_sheet_id) → status hiện tại từ orders,
    // rồi loại history row không có status hiện tại nằm trong set chọn.
    let currentStatusMap: Map<string, string> | null = null
    if (currentStatuses.length > 0 && includeSheet) {
      let curQuery = supabase.from("orders").select("item_id, google_sheet_id, status").in("status", currentStatuses)
      curQuery = applySheetFilter(curQuery)
      const { data: curRows, error: curErr } = await curQuery
      if (curErr) {
        logServerError(curErr, {
          context: "GET /api/need-repair/stats - current status filter",
          userId: appUser.sub,
          timeRange,
        })
      } else {
        currentStatusMap = new Map(
          (curRows ?? []).map((r: any) => [`${r.item_id}::${r.google_sheet_id}`, r.status]),
        )
      }
    }

    let repairData: any[] = currentStatusMap
      ? (repairDataRaw ?? []).filter((r: any) => {
          if (r.google_sheet_id === MERA_SHEET_ID) return true
          return currentStatusMap!.has(`${r.item_id}::${r.google_sheet_id}`)
        })
      : (repairDataRaw ?? [])

    // === Mera fetch (nếu cần) cho filter projectIds / currentStatuses của Mera rows ===
    if (includeMera && (projectIds.length > 0 || currentStatuses.length > 0)) {
      try {
        const actor = { id: appUser.sub, email: appUser.email }
        const meraOrders = await fetchAllMeraOrders(actor, {})
        const matchProject = (o: MeraOrder) =>
          projectIds.length === 0 || (o.project_id && projectIds.includes(o.project_id))

        const meraCurrentStatusByItem = new Map<string, string>()
        const meraProjectByItem = new Map<string, string | null | undefined>()
        for (const order of meraOrders) {
          const items = order.items ?? []
          for (const item of items) {
            if (!item.item_key) continue
            meraCurrentStatusByItem.set(item.item_key, item.status)
            meraProjectByItem.set(item.item_key, order.project_id)
          }
        }

        if (currentStatuses.length > 0) {
          repairData = repairData.filter((r: any) => {
            if (r.google_sheet_id !== MERA_SHEET_ID) return true
            const cur = meraCurrentStatusByItem.get(r.item_id)
            return cur ? currentStatuses.includes(cur) : false
          })
        }
        if (projectIds.length > 0) {
          repairData = repairData.filter((r: any) => {
            if (r.google_sheet_id !== MERA_SHEET_ID) return true
            const pid = meraProjectByItem.get(r.item_id)
            return pid != null && projectIds.includes(pid)
          })
        }
      } catch (meraErr) {
        logServerError(meraErr as Error, {
          context: "GET /api/need-repair/stats - Mera filter fetch",
          userId: appUser.sub,
          timeRange,
        })
      }
    }

    // === Designer stats từ RPC ===
    // Đơn vị: đơn ĐÃ CONFIRMED (đơn chốt) trong dateRange.
    // Designer = designer ĐẦU TIÊN trong order_history (snapshot sớm nhất).
    // Tỉ lệ = (đơn có ≥1 NEED REPAIR | design_error | customer_change) / (đơn CONFIRMED).
    const { data: designerRpcData, error: designerRpcError } = await supabase.rpc(
      "get_designer_repair_stats",
      {
        p_time_from: dateRange?.start.toISOString() ?? null,
        p_time_to: dateRange?.end.toISOString() ?? null,
        p_sheet_ids: sheetIds.length > 0 ? sheetIds : null,
        p_include_sheet: includeSheet,
        p_include_mera: includeMera,
      },
    )
    if (designerRpcError) {
      logServerError(designerRpcError, {
        context: "GET /api/need-repair/stats - RPC get_designer_repair_stats",
        userId: appUser.sub,
        timeRange,
      })
    }

    if (error) {
      logServerError(error, {
        context: "GET /api/need-repair/stats",
        userId: appUser.sub,
        timeRange,
      })
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch repair statistics",
          debug: {
            message: "Database query failed",
            details: error.message,
            hint: error.hint,
            code: error.code,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 },
      )
    }

    // === Process NEED REPAIR EVENTS (cho detailedRecords, productTypeStats, dailyStats, summary) ===
    // Đây là sự kiện NEED REPAIR trong khoảng dateRange (theo lúc bị mark).
    // Khác với designerStats — đo theo ĐƠN CONFIRMED.
    const changeTypeStats = { design_error: 0, customer_change: 0 }
    const productTypeStats = new Map<string, { times: number; orderIds: Set<string> }>()
    const dailyStats = new Map<string, number>()
    const allOrderIds = new Set<string>()

    repairData?.forEach((record) => {
      const changeType = record.change_type
      const productType = record.product_type || "Unknown"
      const date = new Date(record.created_at).toDateString()
      const orderKey = record.item_id
        ? `${record.item_id}::${record.google_sheet_id}`
        : `__row_${record.id}`

      allOrderIds.add(orderKey)

      if (changeType && changeTypeStats.hasOwnProperty(changeType)) {
        changeTypeStats[changeType as keyof typeof changeTypeStats]++
      }

      const product = productTypeStats.get(productType) ?? { times: 0, orderIds: new Set<string>() }
      product.times++
      product.orderIds.add(orderKey)
      productTypeStats.set(productType, product)

      dailyStats.set(date, (dailyStats.get(date) || 0) + 1)
    })

    // === Build designer stats array từ RPC output ===
    // RPC trả về (per designer): confirmed_orders, orders_need_repair, orders_design_error,
    // orders_customer_change, need_repair_times, design_error_times, customer_change_times.
    const designerStatsArray = (designerRpcData ?? []).map((row: any) => {
      const confirmed = Number(row.confirmed_orders) || 0
      const orders = Number(row.orders_need_repair) || 0
      const ordersDe = Number(row.orders_design_error) || 0
      const ordersCc = Number(row.orders_customer_change) || 0
      const times = Number(row.need_repair_times) || 0
      const deTimes = Number(row.design_error_times) || 0
      const ccTimes = Number(row.customer_change_times) || 0
      return {
        designer: row.designer_display || row.designer || "Unassigned",
        orders, // "Đơn cần sửa" = đơn CONFIRMED có ≥1 NEED REPAIR
        times, // "Lần sửa" = tổng số lần mark NEED REPAIR trên đơn của designer
        avg_times_per_order: orders > 0 ? times / orders : 0,
        design_error: deTimes, // "Design Errors" theo LẦN
        customer_change: ccTimes,
        design_error_orders: ordersDe, // số đơn distinct có ≥1 design_error
        error_rate: orders > 0 ? (ordersDe / orders) * 100 : 0,
        total_orders_processed: confirmed, // "Tổng đơn" = đơn CONFIRMED của designer
        repair_rate: confirmed > 0 ? (orders / confirmed) * 100 : null,
        repair_rate_design_error: confirmed > 0 ? (ordersDe / confirmed) * 100 : null,
        repair_rate_customer_change: confirmed > 0 ? (ordersCc / confirmed) * 100 : null,
        total: times, // legacy
        products: [] as Array<{ product: string; count: number }>,
      }
    })

    const productTypeStatsArray = Array.from(productTypeStats.entries())
      .map(([product, stats]) => ({
        product,
        count: stats.times, // số lần mark
        orders: stats.orderIds.size, // số đơn distinct
      }))
      .sort((a, b) => b.count - a.count)

    const dailyStatsArray = Array.from(dailyStats.entries())
      .map(([date, count]) => ({
        date,
        count,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const totalTimes = repairData?.length || 0
    const totalOrders = allOrderIds.size

    const detailedRecords =
      repairData?.map((record) => ({
        id: record.id,
        item_id: record.item_id,
        designer: record.designer || "Unassigned",
        product_type: record.product_type || "Unknown",
        order_note: record.order_note,
        created_at: record.created_at,
        users: record.users,
        source: record.google_sheet_id === MERA_SHEET_ID ? "mera" : "sheet",
      })) || []

    logServerInfo("Need repair statistics fetched successfully", {
      userId: appUser.sub,
      timeRange,
      totalOrders,
      totalTimes,
      designerCount: designerStatsArray.length,
    })

    return NextResponse.json({
      success: true,
      data: {
        timeRange,
        dateRange: dateRange
          ? {
              start: dateRange.start.toISOString(),
              end: dateRange.end.toISOString(),
            }
          : null,
        summary: {
          totalOrders, // số ĐƠN distinct cần sửa
          totalTimes, // tổng số LẦN mark NEED REPAIR
          designErrors: changeTypeStats.design_error, // số lần có change_type=design_error
          customerChanges: changeTypeStats.customer_change,
          uniqueDesigners: designerStatsArray.length,
          // Trường legacy — bằng totalTimes, giữ để không vỡ phần khác nếu còn dùng
          totalRepairs: totalTimes,
        },
        designerStats: designerStatsArray,
        changeTypeStats,
        productTypeStats: productTypeStatsArray,
        dailyStats: dailyStatsArray,
        detailedRecords, // Added detailed records for the new tab
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("authorization header") || error.message.includes("token"))) {
      return unauthorizedResponse(error.message)
    }
    logServerError(error as Error, { context: "GET /api/need-repair/stats" })
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
        debug: {
          message: (error as Error).message,
          stack: (error as Error).stack,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    )
  }
}
