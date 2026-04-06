import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, unauthorizedResponse } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase"
import { logServerError, logServerInfo } from "@/lib/server-sentry"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const appUser = await authenticateRequest(request)
    const supabase = createServerClient()
    const { id: sheetId } = await params
    const body = await request.json()

    const { name, description, googleSheetId, tabName, configuration } = body

    // Fetch existing sheet to check existence
    const { data: existingSheet, error: fetchError } = await supabase
      .from("sheets")
      .select("id")
      .eq("id", sheetId)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      logServerError(fetchError, { context: "PUT /api/sheets/:id - fetch existing", userId: appUser.sub, sheetId })
      return NextResponse.json(
        { success: false, error: "Database error", message: fetchError.message },
        { status: 500 },
      )
    }
    if (!existingSheet) {
      return NextResponse.json(
        { success: false, error: "Not Found", message: "Sheet configuration not found." },
        { status: 404 },
      )
    }

    // Validation rules (similar to POST, but fields are optional for update)
    if (name && name.length > 100) {
      return NextResponse.json(
        { success: false, error: "Validation Error", message: "Name max 100 characters." },
        { status: 400 },
      )
    }
    if (googleSheetId && !/^[a-zA-Z0-9_-]+$/.test(googleSheetId)) {
      return NextResponse.json(
        { success: false, error: "Validation Error", message: "Invalid Google Sheet ID format." },
        { status: 400 },
      )
    }
    if (tabName && tabName.length > 50) {
      return NextResponse.json(
        { success: false, error: "Validation Error", message: "Tab name max 50 characters." },
        { status: 400 },
      )
    }
    if (configuration && typeof configuration !== "object") {
      return NextResponse.json(
        { success: false, error: "Validation Error", message: "Configuration must be an object." },
        { status: 400 },
      )
    }
    // Add more specific validation for configuration if needed, e.g., columnMapping structure

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (googleSheetId) updateData.google_sheet_id = googleSheetId
    if (tabName) updateData.tab_name = tabName
    if (configuration) updateData.configuration = configuration

    const { data: updatedSheet, error: dbError } = await supabase
      .from("sheets")
      .update(updateData)
      .eq("id", sheetId)
      .select(
        `
        id,
        name,
        description,
        google_sheet_id,
        tab_name,
        configuration,
        last_access,
        created_at,
        updated_at,
        createdBy:users(id, name, email, avatar_url, role)
      `,
      )
      .single()

    if (dbError) {
      logServerError(dbError, { context: "PUT /api/sheets/:id", userId: appUser.sub, sheetId })
      return NextResponse.json({ success: false, error: "Database error", message: dbError.message }, { status: 500 })
    }

    logServerInfo("Sheet configuration updated successfully.", { sheetId, userId: appUser.sub })
    return NextResponse.json({ success: true, data: updatedSheet })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("authorization header") || error.message.includes("token"))) {
      return unauthorizedResponse(error.message)
    }
    logServerError(error as Error, { context: "PUT /api/sheets/:id" })
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: (error as Error).message },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const appUser = await authenticateRequest(request)
    const supabase = createServerClient()
    const { id: sheetId } = await params

    // Fetch existing sheet to check existence
    const { data: existingSheet, error: fetchError } = await supabase
      .from("sheets")
      .select("id")
      .eq("id", sheetId)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      logServerError(fetchError, { context: "DELETE /api/sheets/:id - fetch existing", userId: appUser.sub, sheetId })
      return NextResponse.json(
        { success: false, error: "Database error", message: fetchError.message },
        { status: 500 },
      )
    }
    if (!existingSheet) {
      return NextResponse.json(
        { success: false, error: "Not Found", message: "Sheet configuration not found." },
        { status: 404 },
      )
    }

    // TODO: Add business logic check for "active orders" before deletion if necessary
    // For now, proceed with deletion.

    const { error: dbError } = await supabase.from("sheets").delete().eq("id", sheetId)

    if (dbError) {
      logServerError(dbError, { context: "DELETE /api/sheets/:id", userId: appUser.sub, sheetId })
      return NextResponse.json({ success: false, error: "Database error", message: dbError.message }, { status: 500 })
    }

    logServerInfo("Sheet configuration deleted successfully.", { sheetId, userId: appUser.sub })
    return NextResponse.json({ success: true, message: "Sheet configuration deleted successfully" })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("authorization header") || error.message.includes("token"))) {
      return unauthorizedResponse(error.message)
    }
    logServerError(error as Error, { context: "DELETE /api/sheets/:id" })
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: (error as Error).message },
      { status: 500 },
    )
  }
}
