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
      .eq("status", "NEED_REPAIR")

    // Apply date filter if specified
    if (dateRange) {
      query = query.gte("created_at", dateRange.start.toISOString()).lt("created_at", dateRange.end.toISOString())
    }

    const { data: repairData, error } = await query.order("created_at", { ascending: false })

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
    const designerStats = new Map()
    const changeTypeStats = { design_error: 0, customer_change: 0 }
    const productTypeStats = new Map()
    const dailyStats = new Map()

    repairData?.forEach((record) => {
      const designer = record.designer || "Unassigned"
      const changeType = record.change_type
      const productType = record.product_type || "Unknown"
      const date = new Date(record.created_at).toDateString()

      // Designer statistics
      if (!designerStats.has(designer)) {
        designerStats.set(designer, {
          total: 0,
          design_error: 0,
          customer_change: 0,
          products: new Map(),
        })
      }
      const designerStat = designerStats.get(designer)
      designerStat.total++
      if (changeType) {
        designerStat[changeType]++
      }

      // Track products per designer
      const designerProductCount = designerStat.products.get(productType) || 0
      designerStat.products.set(productType, designerProductCount + 1)

      // Change type statistics
      if (changeType && changeTypeStats.hasOwnProperty(changeType)) {
        changeTypeStats[changeType]++
      }

      // Product type statistics
      const productTypeCount = productTypeStats.get(productType) || 0
      productTypeStats.set(productType, productTypeCount + 1)

      // Daily statistics
      const dailyCount = dailyStats.get(date) || 0
      dailyStats.set(date, dailyCount + 1)
    })

    // Convert Maps to arrays for JSON response
    const designerStatsArray = Array.from(designerStats.entries())
      .map(([designer, stats]) => ({
        designer,
        total: stats.total,
        design_error: stats.design_error,
        customer_change: stats.customer_change,
        products: Array.from(stats.products.entries()).map(([product, count]) => ({
          product,
          count,
        })),
      }))
      .sort((a, b) => b.total - a.total)

    const productTypeStatsArray = Array.from(productTypeStats.entries())
      .map(([product, count]) => ({
        product,
        count,
      }))
      .sort((a, b) => b.count - a.count)

    const dailyStatsArray = Array.from(dailyStats.entries())
      .map(([date, count]) => ({
        date,
        count,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const totalRepairs = repairData?.length || 0

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
      totalRepairs,
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
          totalRepairs,
          designErrors: changeTypeStats.design_error,
          customerChanges: changeTypeStats.customer_change,
          uniqueDesigners: designerStatsArray.length,
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
