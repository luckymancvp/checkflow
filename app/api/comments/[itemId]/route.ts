import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, unauthorizedResponse } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase"
import { logServerError, logServerInfo } from "@/lib/server-sentry"
import { publishToChannel } from "@/lib/ably-client"

// GET - Fetch all comments for an order item
export async function GET(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const appUser = await authenticateRequest(request)
    const supabase = createServerClient()
    const { itemId } = await params

    const { data: comments, error } = await supabase
      .from("order_comments")
      .select("*")
      .eq("order_item_id", itemId)
      .order("created_at", { ascending: true })

    if (error) {
      logServerError(error, {
        context: "GET /api/comments/[itemId]",
        userId: appUser.sub,
        itemId,
      })
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch comments",
        },
        { status: 500 },
      )
    }

    logServerInfo("Comments fetched successfully", {
      userId: appUser.sub,
      itemId,
      count: comments?.length || 0,
    })

    return NextResponse.json({
      success: true,
      data: comments || [],
    })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("authorization header") || error.message.includes("token"))) {
      return unauthorizedResponse(error.message)
    }
    logServerError(error as Error, { context: "GET /api/comments/[itemId]" })
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
      },
      { status: 500 },
    )
  }
}

// POST - Create a new comment
export async function POST(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const appUser = await authenticateRequest(request)
    const supabase = createServerClient()
    const { itemId } = await params
    const body = await request.json()

    const { comment_text, user_name, user_email, user_avatar } = body

    if (!comment_text || !user_name || !user_email) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: comment_text, user_name, user_email",
        },
        { status: 400 },
      )
    }

    const { data: comment, error } = await supabase
      .from("order_comments")
      .insert({
        order_item_id: itemId,
        user_email,
        user_name,
        user_avatar: user_avatar || null,
        comment_text,
      })
      .select()
      .single()

    if (error) {
      logServerError(error, {
        context: "POST /api/comments/[itemId]",
        userId: appUser.sub,
        itemId,
      })
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create comment",
        },
        { status: 500 },
      )
    }

    try {
      await publishToChannel(`order-comments:${itemId}`, "comment:new", comment)
    } catch (ablyError) {
      // Log error but don't fail the request
      logServerError(ablyError as Error, {
        context: "POST /api/comments/[itemId] - Ably publish",
        userId: appUser.sub,
        itemId,
      })
    }

    logServerInfo("Comment created successfully", {
      userId: appUser.sub,
      itemId,
      commentId: comment.id,
    })

    return NextResponse.json({
      success: true,
      data: comment,
    })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("authorization header") || error.message.includes("token"))) {
      return unauthorizedResponse(error.message)
    }
    logServerError(error as Error, { context: "POST /api/comments/[itemId]" })
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
      },
      { status: 500 },
    )
  }
}
