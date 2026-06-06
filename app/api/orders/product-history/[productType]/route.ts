import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, unauthorizedResponse } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase"
import { logServerError, logServerInfo } from "@/lib/server-sentry"

export async function GET(request: NextRequest, { params }: { params: Promise<{ productType: string }> }) {
  try {
    const appUser = await authenticateRequest(request)
    const supabase = createServerClient()
    const { productType } = await params
    const { searchParams } = new URL(request.url)
    const googleSheetId = searchParams.get("google_sheet_id")

    // Validate required parameter
    if (!googleSheetId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameter: google_sheet_id",
          debug: {
            message: "google_sheet_id query parameter is required",
            timestamp: new Date().toISOString(),
            context: {
              productType,
              receivedParams: Object.fromEntries(searchParams.entries()),
            },
          },
        },
        { status: 400 },
      )
    }

    // Get sheet name
    const { data: sheetData } = await supabase
      .from("sheets")
      .select("name")
      .eq("google_sheet_id", googleSheetId)
      .single()

    // Fetch all NEED_REPAIR orders for this product type in the specified sheet
    const { data: historyData, error: historyError } = await supabase
      .from("order_history")
      .select(`
        id,
        order_id,
        item_id,
        designer,
        change_type,
        order_note,
        created_at,
        created_by_user:users!created_by(id, name, email)
      `)
      .eq("product_type", productType)
      .eq("google_sheet_id", googleSheetId)
      .eq("status", "NEED REPAIR")
      .order("created_at", { ascending: false })

    if (historyError) {
      logServerError(historyError, {
        context: "GET /api/orders/product-history/[productType]",
        userId: appUser.sub,
        productType,
        googleSheetId,
      })
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch product history",
          debug: {
            message: "Database query failed while fetching product history",
            details: historyError.message,
            hint: historyError.hint,
            code: historyError.code,
            timestamp: new Date().toISOString(),
            context: {
              productType,
              googleSheetId,
              operation: "fetch_product_history",
            },
          },
        },
        { status: 500 },
      )
    }

    // Format the response data
    const formattedOrders =
      historyData?.map((record) => ({
        id: record.id,
        orderId: record.order_id,
        itemId: record.item_id,
        designer: record.designer,
        changeType: record.change_type,
        issueDescription: record.order_note,
        createdAt: record.created_at,
        createdBy: record.created_by_user
          ? {
              id: record.created_by_user.id,
              name: record.created_by_user.name,
              email: record.created_by_user.email,
            }
          : null,
      })) || []

    logServerInfo("Product history fetched successfully", {
      userId: appUser.sub,
      productType,
      googleSheetId,
      orderCount: formattedOrders.length,
    })

    return NextResponse.json({
      success: true,
      data: {
        productType,
        googleSheetId,
        sheetName: sheetData?.name || "Unknown Sheet",
        totalRepairOrders: formattedOrders.length,
        orders: formattedOrders,
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("authorization header") || error.message.includes("token"))) {
      return unauthorizedResponse(error.message)
    }
    logServerError(error as Error, { context: "GET /api/orders/product-history/[productType]" })
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
        debug: {
          message: (error as Error).message,
          stack: (error as Error).stack,
          timestamp: new Date().toISOString(),
          context: {
            operation: "fetch_product_history",
          },
        },
      },
      { status: 500 },
    )
  }
}
