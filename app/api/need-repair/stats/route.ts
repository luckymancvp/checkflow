import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, unauthorizedResponse } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase"
import { logServerError, logServerInfo } from "@/lib/server-sentry"

export async function GET(request: NextRequest) {
  try {
    const appUser = await authenticateRequest(request)
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)

    const timeRange = searchParams.get("timeRange") || "all_time"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

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

    // Build the query
    let query = supabase
      .from("order_history")
      .select(`
        id,
        item_id,
        designer,
        change_type,
        created_at,
        product_type,
        order_note,
        users!created_by(email)
      `)
      .eq("status", "NEED REPAIR")

    // Apply date filter if specified
    if (dateRange) {
      query = query.gte("created_at", dateRange.start.toISOString()).lt("created_at", dateRange.end.toISOString())
    }

    const { data: repairData, error } = await query.order("created_at", { ascending: false })

    // Query mẫu số: tổng số đơn trong bảng `orders` (theo cùng date range để consistent).
    // Dùng để tính "Tỉ lệ cần sửa" = số đơn cần sửa / tổng đơn designer đã xử lý.
    let ordersQuery = supabase.from("orders").select("item_id, designer, created_at")
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
      // Không fail toàn bộ — chỉ là phần mẫu số. Tỉ lệ sẽ rỗng nếu không có dữ liệu.
    }

    // Map: designer -> Set<item_id> để đếm distinct đơn mỗi designer xử lý
    const ordersByDesigner = new Map<string, Set<string>>()
    const allOrdersItemIds = new Set<string>()
    ordersData?.forEach((row) => {
      const designer = row.designer || "Unassigned"
      const itemId = row.item_id
      if (!itemId) return
      allOrdersItemIds.add(itemId)
      if (!ordersByDesigner.has(designer)) ordersByDesigner.set(designer, new Set())
      ordersByDesigner.get(designer)!.add(itemId)
    })

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
