import { type NextRequest, NextResponse } from "next/server"
import { logServerError, logServerInfo } from "@/lib/server-sentry"
import { authenticateRequest, unauthorizedResponse } from "@/lib/auth" // Import the new utility

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request using the new utility function
    const appUser = await authenticateRequest(request)

    // Simulate analytics data (replace with real database queries)
    const analyticsData = {
      revenue: {
        current: 45231.89,
        previous: 37692.41,
        change: 20.1,
      },
      users: {
        current: 2350,
        previous: 839,
        change: 180.1,
      },
      sales: {
        current: 12234,
        previous: 10278,
        change: 19.0,
      },
      conversion: {
        current: 3.2,
        previous: 3.27,
        change: -2.1,
      },
      chartData: [
        { month: "Jan", revenue: 32000, users: 1200 },
        { month: "Feb", revenue: 35000, users: 1400 },
        { month: "Mar", revenue: 38000, users: 1600 },
        { month: "Apr", revenue: 41000, users: 1900 },
        { month: "May", revenue: 43000, users: 2100 },
        { month: "Jun", revenue: 45231, users: 2350 },
      ],
    }

    logServerInfo("Analytics data fetched", { userId: appUser.sub })

    return NextResponse.json(analyticsData)
  } catch (error) {
    // Handle authentication errors specifically
    if (error instanceof Error && (error.message.includes("authorization header") || error.message.includes("token"))) {
      return unauthorizedResponse(error.message)
    }
    logServerError(error as Error, { context: "GET /api/analytics" })
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: (error as Error).message,
        stack: (error as Error).stack,
      },
      { status: 500 },
    )
  }
}
