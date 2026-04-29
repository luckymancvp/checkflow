import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, unauthorizedResponse } from "@/lib/auth"
import { meraClient } from "@/lib/mera-client"
import { logServerError } from "@/lib/server-sentry"

interface ProjectsCache { data: unknown; expiresAt: number }
let cache: ProjectsCache | null = null

export async function GET(request: NextRequest) {
  try {
    await authenticateRequest(request)

    const now = Date.now()
    if (cache && cache.expiresAt > now) {
      return NextResponse.json(cache.data)
    }

    const projects = await meraClient.listProjects()
    const response = { projects }
    cache = { data: response, expiresAt: now + 5 * 60 * 1000 }

    return NextResponse.json(response)
  } catch (err) {
    if ((err as Error).message?.includes("Missing") || (err as Error).message?.includes("Invalid")) {
      return unauthorizedResponse((err as Error).message)
    }
    logServerError(err as Error, { route: "GET /api/mera/projects" })
    const meraErr = err as { status?: number; detail?: unknown }
    const status = meraErr.status && meraErr.status >= 400 ? meraErr.status : 500
    return NextResponse.json({ error: (err as Error).message, detail: meraErr.detail }, { status })
  }
}
