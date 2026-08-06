import * as jose from "jose"
import { APP_JWT_SECRET } from "@/lib/env"

// Short-lived token that can travel in an <img> URL query string.
// Signed with a DERIVED secret so an image token can never be replayed as an app JWT.
const IMAGE_SECRET = `${APP_JWT_SECRET}:drive-image`
const AUDIENCE = "drive-image"

// Long enough that the URL (and therefore the browser cache key) stays stable for a
// full working session — a rotating token would invalidate the HTTP cache constantly.
export const IMAGE_TOKEN_TTL_MS = 12 * 60 * 60 * 1000

const secretKey = () => new TextEncoder().encode(IMAGE_SECRET)

export async function signImageToken(userId: string): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = Date.now() + IMAGE_TOKEN_TTL_MS

  const token = await new jose.SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt / 1000))
    .sign(secretKey())

  return { token, expiresAt }
}

export async function verifyImageToken(token: string): Promise<string> {
  const { payload } = await jose.jwtVerify(token, secretKey(), { audience: AUDIENCE })
  if (!payload.sub) throw new Error("Image token is missing a subject")
  return payload.sub
}
