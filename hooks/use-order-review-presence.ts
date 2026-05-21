"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getAblyBrowserClient } from "@/lib/ably-browser-client"
import type Ably from "ably"

export interface UserPresence {
  id: string
  order_item_id: string
  user_id: string
  user_email: string
  user_name: string
  user_avatar?: string | null
  status: "reviewing" | "idle" | "typing"
  last_activity: string
}

// Sanitize itemId to ensure it's safe as an Ably channel name segment.
// Ably reserves *, ?, [, ] for wildcard patterns and may reject other special chars.
function toChannelSafeId(itemId: string): string {
  return itemId.replace(/[^a-zA-Z0-9\-_.]/g, "_")
}

export function useOrderReviewPresence(itemId: string, enabled = true) {
  const [reviewingUsers, setReviewingUsers] = useState<UserPresence[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const updatePresence = useCallback(
    async (status: "reviewing" | "idle" | "typing" = "reviewing") => {
      if (!user || !enabled) return

      const ably = getAblyBrowserClient()
      const channel = ably.channels.get(`order-review-presence:${toChannelSafeId(itemId)}`)

      try {
        await channel.presence.update({
          order_item_id: itemId,
          user_id: user.id || user.email,
          user_email: user.email,
          user_name: user.name,
          user_avatar: user.avatar_url || null,
          status,
          last_activity: new Date().toISOString(),
        })
      } catch (error) {
        console.error("[useOrderReviewPresence] Error updating presence:", error)
      }
    },
    [itemId, user, enabled],
  )

  useEffect(() => {
    if (!enabled || !user) {
      setLoading(false)
      return
    }

    const ably = getAblyBrowserClient()
    const channel = ably.channels.get(`order-review-presence:${toChannelSafeId(itemId)}`)

    const enterPresence = async () => {
      try {
        await channel.presence.enter({
          order_item_id: itemId,
          user_id: user.id || user.email,
          user_email: user.email,
          user_name: user.name,
          user_avatar: user.avatar_url || null,
          status: "reviewing",
          last_activity: new Date().toISOString(),
        })
      } catch (error) {
        console.error("[useOrderReviewPresence] Error entering presence:", error)
      }
    }

    const handlePresenceUpdate = (member: Ably.PresenceMessage) => {
      const presenceData = member.data as Omit<UserPresence, "id">

      setReviewingUsers((prev) => {
        // Filter out current user
        if (presenceData.user_email === user.email) {
          return prev
        }

        const exists = prev.some((u) => u.user_email === presenceData.user_email)

        if (member.action === "enter" || member.action === "update") {
          const userData: UserPresence = {
            id: member.clientId || presenceData.user_email,
            ...presenceData,
          }

          if (exists) {
            return prev.map((u) => (u.user_email === presenceData.user_email ? userData : u))
          }
          return [...prev, userData]
        } else if (member.action === "leave") {
          return prev.filter((u) => u.user_email !== presenceData.user_email)
        }

        return prev
      })
    }

    channel.presence.subscribe(handlePresenceUpdate)

    channel.presence.get((err, members) => {
      if (err) {
        console.error("[useOrderReviewPresence] Error getting presence:", err)
        setLoading(false)
        return
      }

      const initialUsers: UserPresence[] =
        members
          ?.filter((m) => m.data?.user_email !== user.email)
          .map((m) => ({
            id: m.clientId || m.data.user_email,
            order_item_id: m.data.order_item_id,
            user_id: m.data.user_id,
            user_email: m.data.user_email,
            user_name: m.data.user_name,
            user_avatar: m.data.user_avatar || null,
            status: m.data.status || "reviewing",
            last_activity: m.data.last_activity || new Date().toISOString(),
          })) || []

      setReviewingUsers(initialUsers)
      setLoading(false)
    })

    enterPresence()

    return () => {
      channel.presence.leave()
      channel.presence.unsubscribe(handlePresenceUpdate)
    }
  }, [itemId, user, enabled])

  const setTypingStatus = useCallback(() => {
    updatePresence("typing")
  }, [updatePresence])

  return {
    reviewingUsers,
    loading,
    updatePresence,
    setTypingStatus,
  }
}
