"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getAblyBrowserClient } from "@/lib/ably-browser-client"
import type Ably from "ably"

export interface GlobalUserPresence {
  id: string
  user_id: string
  user_email: string
  user_name: string
  user_avatar?: string | null
  status: "online" | "idle"
  last_activity: string
}

export function useGlobalPresence(enabled = true) {
  const [onlineUsers, setOnlineUsers] = useState<GlobalUserPresence[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const updatePresence = useCallback(
    async (status: "online" | "idle" = "online") => {
      if (!user || !enabled) return

      const ably = getAblyBrowserClient()
      const channel = ably.channels.get("global-user-presence")

      try {
        await channel.presence.update({
          user_id: user.id || user.email,
          user_email: user.email,
          user_name: user.name,
          user_avatar: user.avatar_url || null,
          status,
          last_activity: new Date().toISOString(),
        })
      } catch (error) {
        console.error("[useGlobalPresence] Error updating presence:", error)
      }
    },
    [user, enabled],
  )

  useEffect(() => {
    if (!enabled || !user) {
      setLoading(false)
      return
    }

    const ably = getAblyBrowserClient()
    const channel = ably.channels.get("global-user-presence")

    const enterPresence = async () => {
      try {
        await channel.presence.enter({
          user_id: user.id || user.email,
          user_email: user.email,
          user_name: user.name,
          user_avatar: user.avatar_url || null,
          status: "online",
          last_activity: new Date().toISOString(),
        })
      } catch (error) {
        console.error("[useGlobalPresence] Error entering presence:", error)
      }
    }

    const handlePresenceUpdate = (member: Ably.PresenceMessage) => {
      const presenceData = member.data as Omit<GlobalUserPresence, "id">

      setOnlineUsers((prev) => {
        // Filter out current user
        if (presenceData.user_email === user.email) {
          return prev
        }

        const exists = prev.some((u) => u.user_email === presenceData.user_email)

        if (member.action === "enter" || member.action === "update") {
          const userData: GlobalUserPresence = {
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
        console.error("[useGlobalPresence] Error getting presence:", err)
        setLoading(false)
        return
      }

      const initialUsers: GlobalUserPresence[] =
        members
          ?.filter((m) => m.data?.user_email !== user.email)
          .map((m) => ({
            id: m.clientId || m.data.user_email,
            user_id: m.data.user_id,
            user_email: m.data.user_email,
            user_name: m.data.user_name,
            user_avatar: m.data.user_avatar || null,
            status: m.data.status || "online",
            last_activity: m.data.last_activity || new Date().toISOString(),
          })) || []

      setOnlineUsers(initialUsers)
      setLoading(false)
    })

    enterPresence()

    return () => {
      channel.presence.leave()
      channel.presence.unsubscribe(handlePresenceUpdate)
    }
  }, [user, enabled])

  return {
    onlineUsers,
    loading,
    updatePresence,
  }
}
