"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { useAuth } from "@/contexts/auth-context"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export interface UserPresence {
  id: string
  user_id: string
  user_name: string
  user_avatar: string | null
  user_email: string | null
  order_item_id: string | null
  last_seen: string
  status: "online" | "idle" | "offline"
  created_at: string
  updated_at: string
}

interface UsePresenceOptions {
  orderItemId?: string | null
  enableTracking?: boolean
}

export function usePresence(options: UsePresenceOptions = {}) {
  const { orderItemId = null, enableTracking = true } = options
  const { user } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([])
  const [reviewingUsers, setReviewingUsers] = useState<UserPresence[]>([])
  const [loading, setLoading] = useState(true)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  console.log("[v0] usePresence initialized", {
    userId: user?.id,
    orderItemId,
    enableTracking,
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseKey: !!supabaseAnonKey,
  })

  // Initialize Supabase client
  useEffect(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey)
      console.log("[v0] Supabase client created for presence")
    }
  }, [])

  const upsertPresence = useCallback(async () => {
    if (!user || !enableTracking || !supabaseRef.current) {
      console.log("[v0] Skipping presence upsert", {
        hasUser: !!user,
        enableTracking,
        hasClient: !!supabaseRef.current,
      })
      return
    }

    try {
      const presenceData = {
        user_id: user.id,
        user_name: user.name,
        user_avatar: user.avatar_url || null,
        user_email: user.email,
        order_item_id: orderItemId,
        last_seen: new Date().toISOString(),
        status: "online" as const,
        updated_at: new Date().toISOString(),
      }

      console.log("[v0] Upserting presence", presenceData)

      const { error } = await supabaseRef.current.from("user_presence").upsert(presenceData, {
        onConflict: "user_id",
      })

      if (error) {
        console.error("[v0] Error upserting presence:", error)
      } else {
        console.log("[v0] Presence upserted successfully")
      }
    } catch (err) {
      console.error("[v0] Failed to upsert presence:", err)
    }
  }, [user, orderItemId, enableTracking])

  const removePresence = useCallback(async () => {
    if (!user || !supabaseRef.current) return

    try {
      console.log("[v0] Removing presence for user", user.id)
      const { error } = await supabaseRef.current.from("user_presence").delete().eq("user_id", user.id)

      if (error) {
        console.error("[v0] Error removing presence:", error)
      } else {
        console.log("[v0] Presence removed successfully")
      }
    } catch (err) {
      console.error("[v0] Failed to remove presence:", err)
    }
  }, [user])

  const fetchPresence = useCallback(async () => {
    if (!supabaseRef.current) {
      console.log("[v0] No Supabase client, skipping presence fetch")
      return
    }

    try {
      setLoading(true)
      console.log("[v0] Fetching presence data")

      const { data, error } = await supabaseRef.current
        .from("user_presence")
        .select("*")
        .eq("status", "online")
        .gte("last_seen", new Date(Date.now() - 5 * 60 * 1000).toISOString())

      if (error) {
        console.error("[v0] Error fetching presence:", error)
        return
      }

      console.log("[v0] Fetched presence data", { count: data?.length, data })

      if (data) {
        setOnlineUsers(data as UserPresence[])

        if (orderItemId) {
          const reviewing = data.filter(
            (p) => p.order_item_id === orderItemId && p.user_id !== user?.id,
          ) as UserPresence[]
          console.log("[v0] Reviewing users for order", { orderItemId, count: reviewing.length, reviewing })
          setReviewingUsers(reviewing)
        }
      }
    } catch (err) {
      console.error("[v0] Failed to fetch presence:", err)
    } finally {
      setLoading(false)
    }
  }, [orderItemId, user?.id])

  useEffect(() => {
    if (!user || !enableTracking || !supabaseRef.current) {
      console.log("[v0] Presence tracking not enabled", {
        hasUser: !!user,
        enableTracking,
        hasClient: !!supabaseRef.current,
      })
      setLoading(false)
      return
    }

    console.log("[v0] Setting up presence tracking for user", user.id)
    const supabase = supabaseRef.current

    upsertPresence()
    fetchPresence()

    heartbeatIntervalRef.current = setInterval(() => {
      console.log("[v0] Presence heartbeat")
      upsertPresence()
    }, 30000)

    const channel = supabase
      .channel("user-presence-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
        },
        (payload) => {
          console.log("[v0] Presence real-time update:", payload)

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const presence = payload.new as UserPresence

            setOnlineUsers((prev) => {
              const filtered = prev.filter((p) => p.user_id !== presence.user_id)
              const updated = [...filtered, presence]
              console.log("[v0] Updated online users", { count: updated.length })
              return updated
            })

            if (orderItemId && presence.order_item_id === orderItemId && presence.user_id !== user.id) {
              setReviewingUsers((prev) => {
                const filtered = prev.filter((p) => p.user_id !== presence.user_id)
                const updated = [...filtered, presence]
                console.log("[v0] Updated reviewing users", { count: updated.length })
                return updated
              })
            } else if (orderItemId) {
              setReviewingUsers((prev) => prev.filter((p) => p.user_id !== presence.user_id))
            }
          } else if (payload.eventType === "DELETE") {
            const presence = payload.old as UserPresence

            setOnlineUsers((prev) => prev.filter((p) => p.user_id !== presence.user_id))
            setReviewingUsers((prev) => prev.filter((p) => p.user_id !== presence.user_id))
          }
        },
      )
      .subscribe((status) => {
        console.log("[v0] Presence channel status:", status)
      })

    return () => {
      console.log("[v0] Cleaning up presence tracking")
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
      removePresence()
      supabase.removeChannel(channel)
    }
  }, [user, orderItemId, enableTracking, upsertPresence, fetchPresence, removePresence])

  useEffect(() => {
    if (user && enableTracking) {
      console.log("[v0] Order item changed, updating presence", orderItemId)
      upsertPresence()
    }
  }, [orderItemId, user, enableTracking, upsertPresence])

  return {
    onlineUsers: onlineUsers.filter((p) => p.user_id !== user?.id),
    reviewingUsers,
    loading,
    refresh: fetchPresence,
  }
}
