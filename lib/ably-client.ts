import Ably from "ably"

const DEFAULT_ABLY_KEY = "z2_mPQ.NdbmVw:2TZSyA5Sc1YLZVUF_dBRci8S-IWTzPFwskYoVbXJ5TE"

let ablyRestClient: Ably.Rest | null = null

export function getAblyServerClient(): Ably.Rest {
  if (!ablyRestClient) {
    const apiKey = process.env.ABLY_API_KEY || DEFAULT_ABLY_KEY
    ablyRestClient = new Ably.Rest({ key: apiKey })
  }

  return ablyRestClient
}

/**
 * Publish a message to an Ably channel (server-side)
 */
export async function publishToChannel(channelName: string, eventName: string, data: any) {
  const client = getAblyServerClient()
  const channel = client.channels.get(channelName)

  try {
    await channel.publish(eventName, data)
  } catch (error) {
    console.error(`[Ably] Failed to publish to ${channelName}:`, error)
    throw error
  }
}
