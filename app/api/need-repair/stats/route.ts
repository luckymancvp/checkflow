import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, unauthorizedResponse } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase"
import { logServerError, logServerInfo } from "@/lib/server-sentry"
import { meraClient } from "@/lib/mera-client"
import type { MeraOrder } from "@/types/mera-order"

const MERA_SHEET_ID = "__mera__"
const MERA_PAGE_SIZE = 500
const MERA_MAX_PAGES = 20

function ymd(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

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
    all.push(...(res.orders ?? []))
    if (page >= (res.total_pages ?? 0)) break
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

    // Calculate date range based on timeRange parameter
    const getDateRange = () => {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      switch (timeRange) {
        case "today":
          return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
        case "yesterday":
          const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
          return { start: yesterday, end: today }
        case "this_week":
          const startOfWeek = new Date(today)
          startOfWeek.setDate(today.getDate() - today.getDay())
          return { start: startOfWeek, end: new Date() }
        case "last_week":
          const lastWeekStart = new Date(today)
          lastWeekStart.setDate(today.getDate() - today.getDay() - 7)
          const lastWeekEnd = new Date(lastWeekStart)
          lastWeekEnd.setDate(lastWeekStart.getDate() + 7)
          return { start: lastWeekStart, end: lastWeekEnd }
        case "this_month":
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          return { start: startOfMonth, end: new Date() }
        case "last_month":
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)
          return { start: lastMonthStart, end: lastMonthEnd }
        case "custom":
          if (startDate && endDate) {
            return { start: new Date(startDate), end: new Date(endDate) }
          }
          return null
        case "all_time":
        default:
          return null
      }
    }

    const dateRange = getDateRange()

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
          // Mera rows được filter riêng ở khối Mera bên dưới (dựa trên current item status từ Mera).
          if (r.google_sheet_id === MERA_SHEET_ID) return true
          return currentStatusMap!.has(`${r.item_id}::${r.google_sheet_id}`)
        })
      : (repairDataRaw ?? [])

    // Query mẫu số (Sheet): tổng số đơn trong bảng `orders` (theo cùng date range để consistent).
    const ordersByDesigner = new Map<string, Set<string>>()
    const allOrdersItemIds = new Set<string>()
    if (includeSheet) {
      let ordersQuery = supabase.from("orders").select("item_id, designer, created_at, google_sheet_id")
      ordersQuery = applySheetFilter(ordersQuery)
      if (dateRange) {
        ordersQuery = ordersQuery
          .gte("created_at", dateRange.start.toISOString())
          .lt("created_at", dateRange.end.toISOString())
      }
      const { data: ordersData, error: ordersError } = await ordersQuery
      if (ordersError) {
        logServerError(ordersError, {
          context: "GET /api/need-repair/stats - orders denominator",
          userId: appUser.sub,
          timeRange,
        })
      }
      ordersData?.forEach((row) => {
        const designer = row.designer || "Unassigned"
        const itemId = row.item_id
        if (!itemId) return
        allOrdersItemIds.add(itemId)
        if (!ordersByDesigner.has(designer)) ordersByDesigner.set(designer, new Set())
        ordersByDesigner.get(designer)!.add(itemId)
      })
    }

    // === MERA branch — chỉ fetch để có mẫu số (tổng đơn designer xử lý) ===
    // Tử số (NEED REPAIR) đã được log vào order_history khi PATCH qua /api/mera/*,
    // và đã được query chung ở khối order_history phía trên.
    // Ngoài ra dùng để build map current-status cho filter currentStatuses.
    if (includeMera) {
      try {
        const actor = { id: appUser.sub, email: appUser.email }
        const meraDateParams: { date_from?: string; date_to?: string } = {}
        if (dateRange) {
          meraDateParams.date_from = ymd(dateRange.start)
          meraDateParams.date_to = ymd(new Date(dateRange.end.getTime() - 1))
        }

        const meraDenomOrders = await fetchAllMeraOrders(actor, { ...meraDateParams })
        const matchProject = (o: MeraOrder) =>
          projectIds.length === 0 || (o.project_id && projectIds.includes(o.project_id))

        // Mẫu số + map current status cho từng Mera item
        const meraCurrentStatusByItem = new Map<string, string>()
        for (const order of meraDenomOrders) {
          if (!matchProject(order)) continue
          const items = order.items ?? []
          for (const item of items) {
            if (!item.item_key) continue
            meraCurrentStatusByItem.set(item.item_key, item.status)
            const designer = item.designer?.name || order.designer?.name || "Unassigned"
            allOrdersItemIds.add(item.item_key)
            if (!ordersByDesigner.has(designer)) ordersByDesigner.set(designer, new Set())
            ordersByDesigner.get(designer)!.add(item.item_key)
          }
        }

        // Áp filter currentStatuses cho Mera rows nếu có
        if (currentStatuses.length > 0) {
          repairData = repairData.filter((r: any) => {
            if (r.google_sheet_id !== MERA_SHEET_ID) return true
            const cur = meraCurrentStatusByItem.get(r.item_id)
            return cur ? currentStatuses.includes(cur) : false
          })
        } else if (projectIds.length > 0) {
          // Khi không lọc currentStatuses nhưng có lọc project — chỉ giữ Mera rows
          // thuộc các project được chọn (đo bằng map đã build từ meraDenomOrders).
          repairData = repairData.filter((r: any) => {
            if (r.google_sheet_id !== MERA_SHEET_ID) return true
            return meraCurrentStatusByItem.has(r.item_id)
          })
        }
      } catch (meraErr) {
        logServerError(meraErr as Error, {
          context: "GET /api/need-repair/stats - Mera fetch",
          userId: appUser.sub,
          timeRange,
        })
        // Mera fail không làm hỏng toàn bộ — chỉ thiếu phần mẫu số Mera.
      }
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

    // Process the data for statistics
    // Mỗi row trong order_history = 1 LẦN mark NEED REPAIR. Cùng 1 item_id có thể bị
    // mark nhiều lần. Vì vậy ta theo dõi cả số ĐƠN distinct và số LẦN mark.
    const designerStats = new Map<string, {
      times: number
      design_error_times: number
      customer_change_times: number
      orderIds: Set<string>
      design_error_orderIds: Set<string>
      customer_change_orderIds: Set<string>
      products: Map<string, number>
    }>()
    const changeTypeStats = { design_error: 0, customer_change: 0 }
    const productTypeStats = new Map<string, { times: number; orderIds: Set<string> }>()
    const dailyStats = new Map<string, number>()
    const allOrderIds = new Set<string>()

    repairData?.forEach((record) => {
      const designer = record.designer || "Unassigned"
      const changeType = record.change_type
      const productType = record.product_type || "Unknown"
      const date = new Date(record.created_at).toDateString()
      const orderKey = record.item_id ?? `__row_${record.id}` // fallback nếu item_id null

      allOrderIds.add(orderKey)

      // Designer statistics
      if (!designerStats.has(designer)) {
        designerStats.set(designer, {
          times: 0,
          design_error_times: 0,
          customer_change_times: 0,
          orderIds: new Set(),
          design_error_orderIds: new Set(),
          customer_change_orderIds: new Set(),
          products: new Map(),
        })
      }
      const designerStat = designerStats.get(designer)!
      designerStat.times++
      designerStat.orderIds.add(orderKey)
      if (changeType === "design_error") {
        designerStat.design_error_times++
        designerStat.design_error_orderIds.add(orderKey)
      } else if (changeType === "customer_change") {
        designerStat.customer_change_times++
        designerStat.customer_change_orderIds.add(orderKey)
      }

      // Track products per designer (đếm theo lần mark)
      const designerProductCount = designerStat.products.get(productType) || 0
      designerStat.products.set(productType, designerProductCount + 1)

      // Change type statistics (đếm theo lần mark)
      if (changeType && changeTypeStats.hasOwnProperty(changeType)) {
        changeTypeStats[changeType as keyof typeof changeTypeStats]++
      }

      // Product type statistics
      const product = productTypeStats.get(productType) ?? { times: 0, orderIds: new Set<string>() }
      product.times++
      product.orderIds.add(orderKey)
      productTypeStats.set(productType, product)

      // Daily statistics (theo lần mark)
      const dailyCount = dailyStats.get(date) || 0
      dailyStats.set(date, dailyCount + 1)
    })

    // Convert Maps to arrays for JSON response
    const designerStatsArray = Array.from(designerStats.entries())
      .map(([designer, stats]) => {
        const orders = stats.orderIds.size
        const totalProcessed = ordersByDesigner.get(designer)?.size ?? 0
        return {
          designer,
          orders, // số đơn distinct cần sửa
          times: stats.times, // số lần mark NEED REPAIR
          avg_times_per_order: orders > 0 ? stats.times / orders : 0,
          design_error: stats.design_error_times, // số lần mark là design_error
          customer_change: stats.customer_change_times,
          design_error_orders: stats.design_error_orderIds.size, // số đơn distinct có design_error
          // Error Rate = tỉ lệ đơn bị design_error / tổng đơn cần sửa của designer
          error_rate: orders > 0 ? (stats.design_error_orderIds.size / orders) * 100 : 0,
          // Mẫu số mới: tổng số đơn designer này đã xử lý (từ bảng orders)
          total_orders_processed: totalProcessed,
          // Tỉ lệ cần sửa tổng (giữ lại để tương thích)
          repair_rate: totalProcessed > 0 ? (orders / totalProcessed) * 100 : null,
          // Tách theo nguyên nhân — tử số là số đơn DISTINCT có ít nhất 1 mark thuộc loại đó
          repair_rate_design_error:
            totalProcessed > 0 ? (stats.design_error_orderIds.size / totalProcessed) * 100 : null,
          repair_rate_customer_change:
            totalProcessed > 0 ? (stats.customer_change_orderIds.size / totalProcessed) * 100 : null,
          // Giữ trường `total` để tương thích ngược (= số lần mark)
          total: stats.times,
          products: Array.from(stats.products.entries()).map(([product, count]) => ({
            product,
            count,
          })),
        }
      })
      .sort((a, b) => b.orders - a.orders)

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
