import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, unauthorizedResponse } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase"
import { logServerError, logServerInfo } from "@/lib/server-sentry"

export async function PUT(request: NextRequest, { params }: { params: { historyId: string } }) {
  try {
    const appUser = await authenticateRequest(request)
    const supabase = createServerClient()
    const historyId = params.historyId
    const body = await request.json()

    const { reviewAccuracy } = body

    // Validate review accuracy value
    if (reviewAccuracy !== null && !["correct", "incorrect"].includes(reviewAccuracy)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid review accuracy value. Must be correct, incorrect, or null",
          debug: {
            message: "reviewAccuracy validation failed",
            timestamp: new Date().toISOString(),
            context: {
              receivedValue: reviewAccuracy,
              validValues: ["correct", "incorrect", null],
            },
          },
        },
        { status: 400 },
      )
    }

    // Update the history record
    const { data, error: updateError } = await supabase
      .from("order_history")
      .update({
        review_accuracy: reviewAccuracy,
        updated_at: new Date().toISOString(),
      })
      .eq("id", historyId)
      .select("id, review_accuracy, updated_at")
      .single()

    if (updateError) {
      if (updateError.code === "PGRST116") {
        return NextResponse.json(
          {
            success: false,
            error: "History record not found",
            debug: {
              message: "No history record found with the provided ID",
              timestamp: new Date().toISOString(),
              context: {
                historyId,
                operation: "update_review_accuracy",
              },
            },
          },
          { status: 404 },
        )
      }

      logServerError(updateError, {
        context: "PUT /api/orders/history/[historyId]/review-accuracy",
        userId: appUser.sub,
        historyId,
      })
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update review accuracy",
          debug: {
            message: "Database update operation failed",
            details: updateError.message,
            hint: updateError.hint,
            code: updateError.code,
            timestamp: new Date().toISOString(),
            context: {
              historyId,
              reviewAccuracy,
            },
          },
        },
        { status: 500 },
      )
    }

    logServerInfo("Review accuracy updated successfully", {
      userId: appUser.sub,
      historyId,
      reviewAccuracy,
    })

    return NextResponse.json({
      success: true,
      data: {
        historyId: data.id,
        reviewAccuracy: data.review_accuracy,
        updatedAt: data.updated_at,
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("authorization header") || error.message.includes("token"))) {
      return unauthorizedResponse(error.message)
    }
    logServerError(error as Error, { context: "PUT /api/orders/history/[historyId]/review-accuracy" })
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
        debug: {
          message: (error as Error).message,
          stack: (error as Error).stack,
          timestamp: new Date().toISOString(),
          context: {
            operation: "update_review_accuracy",
          },
        },
      },
      { status: 500 },
    )
  }
}
