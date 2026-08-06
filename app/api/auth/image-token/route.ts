import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, unauthorizedResponse } from "@/lib/auth"
import { signImageToken } from "@/lib/image-token"
import { logServerError } from "@/lib/server-sentry"

// Mints the token that <img src="/api/drive-image/..."> carries in its query string,
// since an image element cannot send an Authorization header.
export async function GET(request: NextRequest) {
  try {
    const appUser = await authenticateRequest(request)
    const { token, expiresAt } = await signImageToken(appUser.sub)

    return NextResponse.json(
      { success: true, data: { token, expiresAt } },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Authorization header") || error.message.includes("token"))) {
      return unauthorizedResponse(error.message)
    }
    logServerError(error as Error, { context: "GET /api/auth/image-token" })
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}
