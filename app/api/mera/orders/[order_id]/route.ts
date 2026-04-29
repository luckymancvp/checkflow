import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, unauthorizedResponse } from "@/lib/auth"
import { meraClient } from "@/lib/mera-client"
import { logServerError } from "@/lib/server-sentry"
import type { MeraPatchOrderBody } from "@/types/mera-order"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) {
  try {
    const appUser = await authenticateRequest(request)
    const actor = { id: appUser.sub, email: appUser.email }
    const { order_id } = await params
    const body: MeraPatchOrderBody = await request.json()

    const data = await meraClient.patchOrder(actor, order_id, body)
    return NextResponse.json(data)
  } catch (err) {
    if ((err as Error).message?.includes("Missing") || (err as Error).message?.includes("Invalid")) {
      return unauthorizedResponse((err as Error).message)
    }
    logServerError(err as Error, { route: "PATCH /api/mera/orders/[order_id]" })
    const meraErr = err as { status?: number; detail?: unknown }
    const status = meraErr.status && meraErr.status >= 400 ? meraErr.status : 500
    // Forward 409 conflict payload as-is for client retry logic
    return NextResponse.json(
      status === 409 ? meraErr.detail : { error: (err as Error).message, detail: meraErr.detail },
      { status }
    )
  }
}
