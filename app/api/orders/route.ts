import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, unauthorizedResponse } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase"
import { logServerError, logServerInfo } from "@/lib/server-sentry"

export async function POST(request: NextRequest) {
  try {
    const appUser = await authenticateRequest(request)
    const supabase = createServerClient()
    const body = await request.json()

    const {
      itemId,
      googleSheetId,
      status,
      orderNote,
      designer,
      designLink,
      mockup,
      customerImage,
      personalization,
      date,
      store,
      productImage,
      productType,
      productName,
      changeType,
    } = body

    // Validation
    if (!itemId || !googleSheetId || !status) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: itemId, googleSheetId, status",
          debug: {
            message: "Validation failed for required fields",
            timestamp: new Date().toISOString(),
            context: {
              missingFields: [!itemId && "itemId", !googleSheetId && "googleSheetId", !status && "status"].filter(
                Boolean,
              ),
              receivedBody: JSON.stringify(body),
            },
          },
        },
        { status: 400 },
      )
    }

    // Validate change type for NEED_REPAIR status
    if (status === "NEED_REPAIR" && !changeType) {
      return NextResponse.json(
        {
          success: false,
          error: "Change type required when status is NEED_REPAIR",
          debug: {
            message: "changeType validation failed",
            timestamp: new Date().toISOString(),
            context: {
              status,
              changeType,
            },
          },
        },
        { status: 400 },
      )
    }

    if (changeType && !["design_error", "customer_change"].includes(changeType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid change type. Must be design_error or customer_change",
          debug: {
            message: "changeType validation failed",
            timestamp: new Date().toISOString(),
            context: {
              receivedChangeType: changeType,
              validValues: ["design_error", "customer_change"],
            },
          },
        },
        { status: 400 },
      )
    }

    // Check if order exists
    const { data: existingOrder, error: fetchError } = await supabase
      .from("orders")
      .select("id")
      .eq("item_id", itemId)
      .eq("google_sheet_id", googleSheetId)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      logServerError(fetchError, {
        context: "POST /api/orders - fetch existing order",
        userId: appUser.sub,
        itemId,
        googleSheetId,
      })
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create/update order",
          debug: {
            message: "Database operation failed",
            details: fetchError.message,
            hint: fetchError.hint,
            code: fetchError.code,
            timestamp: new Date().toISOString(),
            context: {
              operation: "fetch_existing",
              table: "orders",
              itemId,
            },
          },
        },
        { status: 500 },
      )
    }

    const isNew = !existingOrder
    const now = new Date().toISOString()

    // Upsert order
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .upsert(
        {
          item_id: itemId,
          google_sheet_id: googleSheetId,
          status,
          order_note: orderNote,
          designer,
          design_link: designLink,
          mockup_link: mockup,
          customer_image: customerImage,
          personalization,
          date,
          store,
          product_image: productImage,
          product_type: productType,
          product_name: productName,
          change_type: changeType,
          updated_at: now,
        },
        {
          onConflict: "item_id,google_sheet_id",
        },
      )
      .select()
      .single()

    if (orderError) {
      logServerError(orderError, {
        context: "POST /api/orders - upsert order",
        userId: appUser.sub,
        itemId,
        googleSheetId,
      })
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create/update order",
          debug: {
            message: "Database operation failed",
            details: orderError.message,
            hint: orderError.hint,
            code: orderError.code,
            timestamp: new Date().toISOString(),
            context: {
              operation: "upsert",
              table: "orders",
              itemId,
            },
          },
        },
        { status: 500 },
      )
    }

    // Create history record
    const { error: historyError } = await supabase.from("order_history").insert({
      order_id: orderData.id,
      item_id: itemId,
      google_sheet_id: googleSheetId,
      status,
      order_note: orderNote,
      designer,
      design_link: designLink,
      mockup_link: mockup,
      customer_image: customerImage,
      personalization,
      date,
      store,
      product_image: productImage,
      product_type: productType,
      product_name: productName,
      change_type: changeType,
      created_by: appUser.sub,
      created_at: now,
    })

    if (historyError) {
      logServerError(historyError, {
        context: "POST /api/orders - create history",
        userId: appUser.sub,
        itemId,
        orderId: orderData.id,
      })
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create/update order",
          debug: {
            message: "Database operation failed",
            details: historyError.message,
            hint: historyError.hint,
            code: historyError.code,
            timestamp: new Date().toISOString(),
            context: {
              operation: "insert",
              table: "order_history",
              itemId,
              orderId: orderData.id,
            },
          },
        },
        { status: 500 },
      )
    }

    logServerInfo(`Order ${isNew ? "created" : "updated"} successfully`, {
      userId: appUser.sub,
      itemId,
      orderId: orderData.id,
      isNew,
    })

    return NextResponse.json({
      success: true,
      data: {
        ...orderData,
        isNew,
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("authorization header") || error.message.includes("token"))) {
      return unauthorizedResponse(error.message)
    }
    logServerError(error as Error, { context: "POST /api/orders" })
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
        debug: {
          message: (error as Error).message,
          stack: (error as Error).stack,
          timestamp: new Date().toISOString(),
          context: {
            operation: "create_order",
          },
        },
      },
      { status: 500 },
    )
  }
}
