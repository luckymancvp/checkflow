import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, unauthorizedResponse } from "@/lib/auth"
import { meraClient } from "@/lib/mera-client"
import { logServerError } from "@/lib/server-sentry"
import type { MeraListOrdersParams } from "@/types/mera-order"

export async function GET(request: NextRequest) {
  try {
    const appUser = await authenticateRequest(request)
    const actor = { id: appUser.sub, email: appUser.email }

    const sp = request.nextUrl.searchParams
    const params: MeraListOrdersParams = {
      page: sp.get("page") ? Number(sp.get("page")) : undefined,
      page_size: sp.get("page_size") ? Number(sp.get("page_size")) : undefined,
      channel: sp.get("channel") ?? undefined,
      status: sp.get("status") ?? undefined,
      statuses: sp.getAll("statuses").length ? sp.getAll("statuses") : undefined,
      store: sp.get("store") ?? undefined,
      provider: sp.get("provider") ?? undefined,
      designer: sp.get("designer") ?? undefined,
      project_id: sp.get("project_id") ?? undefined,
      q: sp.get("q") ?? undefined,
      include_items: sp.get("include_items") === "true",
    }

    const data = await meraClient.listOrders(actor, params)
    return NextResponse.json(data)
  } catch (err) {
    if ((err as Error).message?.includes("Missing") || (err as Error).message?.includes("Invalid")) {
      return unauthorizedResponse((err as Error).message)
    }
    logServerError(err as Error, { route: "GET /api/mera/orders" })
    const meraErr = err as { status?: number; detail?: unknown }
    const status = meraErr.status && meraErr.status >= 400 ? meraErr.status : 500
    return NextResponse.json({ error: (err as Error).message, detail: meraErr.detail }, { status })
  }
}
