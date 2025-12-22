"use client"

import Ably from "ably"

const DEFAULT_ABLY_KEY = "z2_mPQ.NdbmVw:2TZSyA5Sc1YLZVUF_dBRci8S-IWTzPFwskYoVbXJ5TE"

let ablyBrowserClient: Ably.Realtime | null = null

/**
 * Get or create Ably browser client (singleton)
 * Uses hardcoded default key for convenience
 */
export function getAblyBrowserClient(): Ably.Realtime {
  if (!ablyBrowserClient) {
    ablyBrowserClient = new Ably.Realtime({
      key: DEFAULT_ABLY_KEY,
      echoMessages: false,
      clientId: `user-${Date.now()}`,
    })
  }

  return ablyBrowserClient
}
