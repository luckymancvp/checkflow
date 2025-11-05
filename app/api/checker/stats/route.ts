import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, unauthorizedResponse } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase"
import { logServerError, logServerInfo } from "@/lib/server-sentry"

export async function GET(request: NextRequest) {
  try {
    const appUser = await authenticateRequest(request)
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)

    const timeRange = searchParams.get("timeRange") || "today"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const reviewerId = searchParams.get("reviewerId")

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

    // Build the query for order history
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

    // Apply date filter if specified
    if (dateRange) {
      query = query.gte("created_at", dateRange.start.toISOString()).lt("created_at", dateRange.end.toISOString())
    }

    // Apply reviewer filter if specified
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

    // Process the data for statistics
    const reviewerStats = new Map()
    const statusStats = new Map()
    const dailyStats = new Map()

    historyData?.forEach((record) => {
      const reviewer = record.users
      const reviewerId = reviewer?.id || "unknown"
      const reviewerName = reviewer?.name || "Unknown"
      const reviewerEmail = reviewer?.email || ""
      const status = record.status
      const date = new Date(record.created_at).toDateString()

      // Reviewer statistics
      if (!reviewerStats.has(reviewerId)) {
        reviewerStats.set(reviewerId, {
          id: reviewerId,
          name: reviewerName,
          email: reviewerEmail,
          avatar_url: reviewer?.avatar_url || null,
          role: reviewer?.role || "user",
          total: 0,
          byStatus: {},
          byChangeType: {
            design_error: 0,
            customer_change: 0,
          },
        })
      }
      const reviewerStat = reviewerStats.get(reviewerId)
      reviewerStat.total++

      // Count by status
      if (!reviewerStat.byStatus[status]) {
        reviewerStat.byStatus[status] = 0
      }
      reviewerStat.byStatus[status]++

      // Count by change type
      if (record.change_type) {
        reviewerStat.byChangeType[record.change_type]++
      }

      // Status statistics
      const statusCount = statusStats.get(status) || 0
      statusStats.set(status, statusCount + 1)

      // Daily statistics
      if (!dailyStats.has(date)) {
        dailyStats.set(date, {
          date,
          total: 0,
          byReviewer: {},
        })
      }
      const dailyStat = dailyStats.get(date)
      dailyStat.total++
      if (!dailyStat.byReviewer[reviewerId]) {
        dailyStat.byReviewer[reviewerId] = {
          name: reviewerName,
          count: 0,
        }
      }
      dailyStat.byReviewer[reviewerId].count++
    })

    // Convert Maps to arrays for JSON response
    const reviewerStatsArray = Array.from(reviewerStats.values()).sort((a, b) => b.total - a.total)

    const statusStatsArray = Array.from(statusStats.entries())
      .map(([status, count]) => ({
        status,
        count,
      }))
      .sort((a, b) => b.count - a.count)

    const dailyStatsArray = Array.from(dailyStats.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )

    const totalReviews = historyData?.length || 0

    // Detailed records with full information
    const detailedRecords =
      historyData?.map((record) => ({
        id: record.id,
        item_id: record.item_id,
        google_sheet_id: record.google_sheet_id,
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
      })) || []

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
          ? {
              start: dateRange.start.toISOString(),
              end: dateRange.end.toISOString(),
            }
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
