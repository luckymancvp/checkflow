import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, unauthorizedResponse } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase"
import { logServerError, logServerInfo } from "@/lib/server-sentry"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const appUser = await authenticateRequest(request)
    const supabase = createServerClient()
    const orderId = params.id

    // First try to find order by UUID, then by item_id
    let orderQuery = supabase.from("orders").select("id, item_id, google_sheet_id")

    // Check if it's a UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)

    if (isUUID) {
      orderQuery = orderQuery.eq("id", orderId)
    } else {
      orderQuery = orderQuery.eq("item_id", orderId)
    }

    const { data: orderData, error: orderError } = await orderQuery.single()

    if (orderError && orderError.code !== "PGRST116") {
      logServerError(orderError, {
        context: "GET /api/orders/[id]/history - fetch order",
        userId: appUser.sub,
        orderId,
      })
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch order history",
          debug: {
            message: "Database query failed",
            details: orderError.message,
            hint: orderError.hint,
            code: orderError.code,
            timestamp: new Date().toISOString(),
            context: {
              orderId,
              operation: "fetch_order",
            },
          },
        },
        { status: 500 },
      )
    }

    // If no order found, return empty history (never 404)
    if (!orderData) {
      logServerInfo("Order not found, returning empty history", {
        userId: appUser.sub,
        orderId,
      })
      return NextResponse.json({
        success: true,
        data: {
          order: null,
          history: [],
        },
      })
    }

    // Get sheet name
    const { data: sheetData } = await supabase
      .from("sheets")
      .select("name")
      .eq("google_sheet_id", orderData.google_sheet_id)
      .single()

    // Fetch order history with user information
    const { data: historyData, error: historyError } = await supabase
      .from("order_history")
      .select(`
        *,
        created_by_user:users!created_by(id, name, email)
      `)
      .eq("order_id", orderData.id)
      .order("created_at", { ascending: false })

    if (historyError) {
      logServerError(historyError, {
        context: "GET /api/orders/[id]/history - fetch history",
        userId: appUser.sub,
        orderId: orderData.id,
      })
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch order history",
          debug: {
            message: "Database query failed",
            details: historyError.message,
            hint: historyError.hint,
            code: historyError.code,
            timestamp: new Date().toISOString(),
            context: {
              orderId: orderData.id,
              operation: "fetch_history",
            },
          },
        },
        { status: 500 },
      )
    }

    // Format history data
    const formattedHistory =
      historyData?.map((record) => ({
        id: record.id,
        orderId: record.order_id,
        itemId: record.item_id,
        googleSheetId: record.google_sheet_id,
        status: record.status,
        orderNote: record.order_note,
        designer: record.designer,
        designLink: record.design_link,
        mockup: record.mockup_link,
        customerImage: record.customer_image,
        personalization: record.personalization,
        date: record.date,
        store: record.store,
        productImage: record.product_image,
        productType: record.product_type,
        productName: record.product_name,
        changeType: record.change_type,
        reviewAccuracy: record.review_accuracy,
        createdBy: record.created_by_user
          ? {
              id: record.created_by_user.id,
              name: record.created_by_user.name,
              email: record.created_by_user.email,
              role: "user",
            }
          : null,
        createdAt: record.created_at,
      })) || []

    logServerInfo("Order history fetched successfully", {
      userId: appUser.sub,
      orderId: orderData.id,
      historyCount: formattedHistory.length,
    })

    return NextResponse.json({
      success: true,
      data: {
        order: {
          id: orderData.id,
          itemId: orderData.item_id,
          googleSheetId: orderData.google_sheet_id,
          sheetName: sheetData?.name || "Unknown Sheet",
        },
        history: formattedHistory,
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("authorization header") || error.message.includes("token"))) {
      return unauthorizedResponse(error.message)
    }
    logServerError(error as Error, { context: "GET /api/orders/[id]/history" })
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
        debug: {
          message: (error as Error).message,
          stack: (error as Error).stack,
          timestamp: new Date().toISOString(),
          context: {
            operation: "fetch_order_history",
          },
        },
      },
      { status: 500 },
    )
  }
}
