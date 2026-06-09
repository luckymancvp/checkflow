import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, unauthorizedResponse } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase"
import { logServerError, logServerInfo } from "@/lib/server-sentry"
import { getDateRange } from "@/lib/time-range"
import { meraClient } from "@/lib/mera-client"
import type { MeraOrder } from "@/types/mera-order"

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

    const timeRange = searchParams.get("timeRange") || "today"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const reviewerId = searchParams.get("reviewerId")

    // sheetIds: CSV google_sheet_id (rỗng = tất cả Sheet).
    const sheetIds = (searchParams.get("sheetIds") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    // currentStatuses: CSV. Khi có giá trị → chỉ giữ review record mà đơn HIỆN ĐANG ở status đó.
    const currentStatuses = (searchParams.get("currentStatuses") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    // projectIds: CSV Mera project ID. Áp cho phần Mera. Rỗng = tất cả project.
    const projectIds = (searchParams.get("projectIds") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    const includeMera = (searchParams.get("includeMera") ?? "true") === "true"
    const includeSheet = (searchParams.get("includeSheet") ?? "true") === "true"

    const dateRange = getDateRange(timeRange, startDate, endDate)

    const applySheetIdFilter = (q: any): any => {
      if (sheetIds.length > 0) return q.in("google_sheet_id", sheetIds)
      return q
    }

    // Filter nguồn dữ liệu cho order_history (Sheet vs Mera, Mera dùng google_sheet_id='__mera__').
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
      // Cả 2 đều tắt → trả query rỗng.
      return q.eq("google_sheet_id", "__none__")
    }

    // === Query order_history ===
    let query = supabase
      .from("order_history")
      .select(
        `
        id,
        item_id,
        google_sheet_id,
        status,
        order_note,
        designer,
        design_link,
        mockup_link,
        customer_image,
        personalization,
        date,
        store,
        product_image,
        product_type,
        product_name,
        change_type,
        review_accuracy,
        created_at,
        created_by,
        users!created_by(id, name, email, role, avatar_url)
      `,
      )
      .order("created_at", { ascending: false })

    query = applySourceFilter(query)

    if (dateRange) {
      query = query.gte("created_at", dateRange.start.toISOString()).lt("created_at", dateRange.end.toISOString())
    }

    if (reviewerId) {
      query = query.eq("created_by", reviewerId)
    }

    const { data: historyData, error } = await query

    if (error) {
      logServerError(error, {
        context: "GET /api/checker/stats",
        userId: appUser.sub,
        timeRange,
      })
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch checker statistics",
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

    // === currentStatuses filter cho Sheet rows ===
    // Lấy map (item_id, google_sheet_id) → status hiện tại từ bảng orders.
    let sheetCurrentStatusMap: Map<string, string> | null = null
    if (currentStatuses.length > 0 && includeSheet) {
      let curQuery = supabase.from("orders").select("item_id, google_sheet_id, status").in("status", currentStatuses)
      curQuery = applySheetIdFilter(curQuery)
      const { data: curRows, error: curErr } = await curQuery
      if (curErr) {
        logServerError(curErr, {
          context: "GET /api/checker/stats - current status filter (sheet)",
          userId: appUser.sub,
          timeRange,
        })
      } else {
        sheetCurrentStatusMap = new Map(
          (curRows ?? []).map((r: any) => [`${r.item_id}::${r.google_sheet_id}`, r.status]),
        )
      }
    }

    // === Mera fetch — cần cho filter projectIds & currentStatuses trên Mera rows ===
    let meraCurrentStatusByItem: Map<string, string> | null = null
    let meraProjectByItem: Map<string, string | null | undefined> | null = null
    const needMera =
      includeMera && (projectIds.length > 0 || currentStatuses.length > 0)
    if (needMera) {
      try {
        const actor = { id: appUser.sub, email: appUser.email }
        // All-time để cover các item bị mark trong window nhưng order tạo trước window.
        const meraOrders = await fetchAllMeraOrders(actor, {})
        meraCurrentStatusByItem = new Map()
        meraProjectByItem = new Map()
        for (const order of meraOrders) {
          const items = order.items ?? []
          for (const item of items) {
            if (!item.item_key) continue
            meraCurrentStatusByItem.set(item.item_key, item.status)
            meraProjectByItem.set(item.item_key, order.project_id)
          }
        }
      } catch (meraErr) {
        logServerError(meraErr as Error, {
          context: "GET /api/checker/stats - Mera fetch",
          userId: appUser.sub,
          timeRange,
        })
      }
    }

    // Apply filter currentStatuses + projectIds lên history rows.
    const filteredHistory = (historyData ?? []).filter((r: any) => {
      const isMera = r.google_sheet_id === MERA_SHEET_ID

      if (isMera) {
        if (!includeMera) return false
        if (projectIds.length > 0) {
          const pid = meraProjectByItem?.get(r.item_id)
          if (!pid || !projectIds.includes(pid)) return false
        }
        if (currentStatuses.length > 0) {
          const cur = meraCurrentStatusByItem?.get(r.item_id)
          if (!cur || !currentStatuses.includes(cur)) return false
        }
        return true
      }

      // Sheet rows
      if (!includeSheet) return false
      if (currentStatuses.length > 0) {
        if (!sheetCurrentStatusMap?.has(`${r.item_id}::${r.google_sheet_id}`)) return false
      }
      return true
    })

    // Process the data for statistics
    const reviewerStats = new Map<string, any>()
    const statusStats = new Map<string, number>()
    const dailyStats = new Map<string, any>()

    filteredHistory.forEach((record: any) => {
      const reviewer = record.users
      const rId = reviewer?.id || "unknown"
      const reviewerName = reviewer?.name || "Unknown"
      const reviewerEmail = reviewer?.email || ""
      const status = record.status
      const date = new Date(record.created_at).toDateString()

      if (!reviewerStats.has(rId)) {
        reviewerStats.set(rId, {
          id: rId,
          name: reviewerName,
          email: reviewerEmail,
          avatar_url: reviewer?.avatar_url || null,
          role: reviewer?.role || "user",
          total: 0,
          byStatus: {} as Record<string, number>,
          byChangeType: { design_error: 0, customer_change: 0 } as Record<string, number>,
          bySource: { sheet: 0, mera: 0 } as Record<string, number>,
        })
      }
      const rs = reviewerStats.get(rId)!
      rs.total++
      rs.byStatus[status] = (rs.byStatus[status] || 0) + 1
      if (record.change_type && rs.byChangeType[record.change_type] != null) {
        rs.byChangeType[record.change_type]++
      }
      const src = record.google_sheet_id === MERA_SHEET_ID ? "mera" : "sheet"
      rs.bySource[src]++

      statusStats.set(status, (statusStats.get(status) || 0) + 1)

      if (!dailyStats.has(date)) {
        dailyStats.set(date, { date, total: 0, byReviewer: {} as Record<string, any> })
      }
      const d = dailyStats.get(date)!
      d.total++
      if (!d.byReviewer[rId]) d.byReviewer[rId] = { name: reviewerName, count: 0 }
      d.byReviewer[rId].count++
    })

    const reviewerStatsArray = Array.from(reviewerStats.values()).sort((a, b) => b.total - a.total)

    const statusStatsArray = Array.from(statusStats.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)

    const dailyStatsArray = Array.from(dailyStats.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )

    const totalReviews = filteredHistory.length

    const detailedRecords = filteredHistory.map((record: any) => ({
      id: record.id,
      item_id: record.item_id,
      google_sheet_id: record.google_sheet_id,
      source: record.google_sheet_id === MERA_SHEET_ID ? "mera" : "sheet",
      status: record.status,
      order_note: record.order_note,
      designer: record.designer,
      design_link: record.design_link,
      mockup_link: record.mockup_link,
      customer_image: record.customer_image,
      personalization: record.personalization,
      date: record.date,
      store: record.store,
      product_image: record.product_image,
      product_type: record.product_type,
      product_name: record.product_name,
      change_type: record.change_type,
      review_accuracy: record.review_accuracy,
      created_at: record.created_at,
      reviewer: {
        id: record.users?.id || "unknown",
        name: record.users?.name || "Unknown",
        email: record.users?.email || "",
        role: record.users?.role || "user",
        avatar_url: record.users?.avatar_url || null,
      },
    }))

    logServerInfo("Checker statistics fetched successfully", {
      userId: appUser.sub,
      timeRange,
      totalReviews,
      reviewerCount: reviewerStatsArray.length,
    })

    return NextResponse.json({
      success: true,
      data: {
        timeRange,
        dateRange: dateRange
          ? { start: dateRange.start.toISOString(), end: dateRange.end.toISOString() }
          : null,
        summary: {
          totalReviews,
          uniqueReviewers: reviewerStatsArray.length,
        },
        reviewerStats: reviewerStatsArray,
        statusStats: statusStatsArray,
        dailyStats: dailyStatsArray,
        detailedRecords,
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("authorization header") || error.message.includes("token"))) {
      return unauthorizedResponse(error.message)
    }
    logServerError(error as Error, { context: "GET /api/checker/stats" })
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
