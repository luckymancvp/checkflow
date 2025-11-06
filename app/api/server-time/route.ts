import { NextResponse } from "next/server"

export async function GET() {
  try {
    const serverTime = new Date().toISOString()
    const serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    return NextResponse.json({
      success: true,
      data: {
        serverTime,
        serverTimezone,
      },
    })
  } catch (error) {
    console.error("[v0] Error getting server time:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get server time",
      },
      { status: 500 },
    )
  }
}
