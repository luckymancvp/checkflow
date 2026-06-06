import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: NextRequest, { params }: { params: { designer: string } }) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      },
    )

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get("timeRange") || "this_week"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const designer = decodeURIComponent(params.designer)

    // Build date filter based on time range
    let query = supabase
      .from("order_history")
      .select(`
        id,
        item_id,
        product_type,
        product_name,
        status,
        order_note,
        designer,
        change_type,
        personalization,
        store,
        created_at,
        updated_at,
        users!created_by(email)
      `)
      .eq("status", "NEED REPAIR")
      .eq("designer", designer)

    // Apply time filtering
    const now = new Date()
    switch (timeRange) {
      case "today":
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        query = query.gte("created_at", today.toISOString())
        break
      case "yesterday":
        const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        query = query.gte("created_at", yesterday.toISOString()).lt("created_at", yesterdayEnd.toISOString())
        break
      case "this_week":
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
        startOfWeek.setHours(0, 0, 0, 0)
        query = query.gte("created_at", startOfWeek.toISOString())
        break
      case "last_week":
        const lastWeekStart = new Date(now.setDate(now.getDate() - now.getDay() - 7))
        lastWeekStart.setHours(0, 0, 0, 0)
        const lastWeekEnd = new Date(now.setDate(now.getDate() - now.getDay()))
        lastWeekEnd.setHours(0, 0, 0, 0)
        query = query.gte("created_at", lastWeekStart.toISOString()).lt("created_at", lastWeekEnd.toISOString())
        break
      case "this_month":
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        query = query.gte("created_at", startOfMonth.toISOString())
        break
      case "last_month":
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)
        query = query.gte("created_at", lastMonthStart.toISOString()).lt("created_at", lastMonthEnd.toISOString())
        break
      case "custom":
        if (startDate && endDate) {
          query = query.gte("created_at", startDate).lte("created_at", endDate)
        }
        break
      case "all_time":
      default:
        // No additional filter
        break
    }

    const { data: repairDetails, error: detailsError } = await query.order("created_at", { ascending: false })

    if (detailsError) {
      console.error("Database error:", detailsError)
      return NextResponse.json({ error: "Failed to fetch repair details" }, { status: 500 })
    }

    const totalRepairs = repairDetails?.length || 0
    const designErrors = repairDetails?.filter((item) => item.change_type === "design_error").length || 0
    const customerChanges = repairDetails?.filter((item) => item.change_type === "customer_change").length || 0
    const productTypesAffected = new Set(repairDetails?.map((item) => item.product_type).filter(Boolean)).size

    const productBreakdownMap = new Map()
    repairDetails?.forEach((item) => {
      if (!item.product_type) return

      if (!productBreakdownMap.has(item.product_type)) {
        productBreakdownMap.set(item.product_type, {
          product_type: item.product_type,
          count: 0,
          design_errors: 0,
          customer_changes: 0,
        })
      }

      const breakdown = productBreakdownMap.get(item.product_type)
      breakdown.count++

      if (item.change_type === "design_error") {
        breakdown.design_errors++
      }
      if (item.change_type === "customer_change") {
        breakdown.customer_changes++
      }
    })

    const productBreakdown = Array.from(productBreakdownMap.values()).sort((a, b) => b.count - a.count)

    return NextResponse.json({
      success: true,
      data: {
        designer,
        summary: {
          total_repairs: totalRepairs,
          design_errors: designErrors,
          customer_changes: customerChanges,
          product_types_affected: productTypesAffected,
        },
        repairDetails: repairDetails || [],
        productBreakdown,
      },
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
