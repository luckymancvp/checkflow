import { createServerClient } from "@/lib/supabase"
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "@/lib/env"

// Server-side Google access tokens, cached per user so the image proxy does not hit
// Supabase (or the OAuth endpoint) once per image.

interface CachedToken {
  accessToken: string
  expiresAt: number
}

const tokenCache = new Map<string, CachedToken>()
const inFlight = new Map<string, Promise<string>>()

const EXPIRY_BUFFER_MS = 60 * 1000

export class DriveAuthError extends Error {}

export async function getDriveAccessToken(userId: string): Promise<string> {
  const cached = tokenCache.get(userId)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.accessToken
  }

  const pending = inFlight.get(userId)
  if (pending) return pending

  const promise = loadAccessToken(userId).finally(() => {
    inFlight.delete(userId)
  })

  inFlight.set(userId, promise)
  return promise
}

async function loadAccessToken(userId: string): Promise<string> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from("google_sheets_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .limit(1)
    .single()

  if (error || !data) {
    throw new DriveAuthError("No Google credentials stored for this user")
  }

  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0

  if (data.access_token && expiresAt - EXPIRY_BUFFER_MS > Date.now()) {
    tokenCache.set(userId, { accessToken: data.access_token, expiresAt: expiresAt - EXPIRY_BUFFER_MS })
    return data.access_token
  }

  if (!data.refresh_token) {
    throw new DriveAuthError("Stored Google access token expired and no refresh token is available")
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new DriveAuthError("Google OAuth credentials are not configured on the server")
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  })

  if (!response.ok) {
    throw new DriveAuthError(`Failed to refresh Google access token: HTTP ${response.status}`)
  }

  const json = await response.json()
  if (!json.access_token) {
    throw new DriveAuthError("Google token refresh returned no access token")
  }

  const newExpiresAt = Date.now() + (json.expires_in ?? 3600) * 1000

  tokenCache.set(userId, {
    accessToken: json.access_token,
    expiresAt: newExpiresAt - EXPIRY_BUFFER_MS,
  })

  // Best effort — a failed write only costs us an extra refresh next time.
  supabase
    .from("google_sheets_tokens")
    .update({
      access_token: json.access_token,
      expires_at: new Date(newExpiresAt).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .then(undefined, () => {})

  return json.access_token
}

export function invalidateDriveAccessToken(userId: string) {
  tokenCache.delete(userId)
}
