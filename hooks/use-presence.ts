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
  orderItemId?: string | null // Track which order item the user is viewing
  enableTracking?: boolean // Enable/disable presence tracking
}

const HEARTBEAT_INTERVAL = 15000 // 15 seconds
const OFFLINE_THRESHOLD = 45000 // 45 seconds

export function usePresence(options: UsePresenceOptions = {}) {
  const { orderItemId = null, enableTracking = true } = options
  const { user } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([])
  const [reviewingUsers, setReviewingUsers] = useState<UserPresence[]>([])
  const [loading, setLoading] = useState(true)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  // Initialize Supabase client
  useEffect(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey)
    }
  }, [])

  const isUserOnline = useCallback((lastSeen: string): boolean => {
    const lastSeenTime = new Date(lastSeen).getTime()
    const now = Date.now()
    return now - lastSeenTime < OFFLINE_THRESHOLD
  }, [])

  const filterOnlineUsers = useCallback(
    (users: UserPresence[]): UserPresence[] => {
      return users.filter((u) => isUserOnline(u.last_seen))
    },
    [isUserOnline],
  )

  // Upsert presence
  const upsertPresence = useCallback(async () => {
    if (!user || !enableTracking || !supabaseRef.current) return

    try {
      const { error } = await supabaseRef.current.from("user_presence").upsert(
        {
          user_id: user.id,
          user_name: user.name,
          user_avatar: user.avatar_url || null,
          user_email: user.email,
          order_item_id: orderItemId,
          last_seen: new Date().toISOString(),
          status: "online",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      )

      if (error) {
        console.error("[usePresence] Error upserting presence:", error)
      }
    } catch (err) {
      console.error("[usePresence] Failed to upsert presence:", err)
    }
  }, [user, orderItemId, enableTracking])

  const removePresence = useCallback(async () => {
    if (!user || !supabaseRef.current) return

    try {
      // Try using fetch with keepalive for more reliable cleanup on tab close
      const { error } = await supabaseRef.current.from("user_presence").delete().eq("user_id", user.id)

      if (error) {
        console.error("[usePresence] Error removing presence:", error)
      }
    } catch (err) {
      console.error("[usePresence] Failed to remove presence:", err)
    }
  }, [user])

  // Fetch all presence data
  const fetchPresence = useCallback(async () => {
    if (!supabaseRef.current) return

    try {
      setLoading(true)
      const { data, error } = await supabaseRef.current
        .from("user_presence")
        .select("*")
        .eq("status", "online")
        .gte("last_seen", new Date(Date.now() - 2 * 60 * 1000).toISOString()) // Last 2 minutes

      if (error) {
        console.error("[usePresence] Error fetching presence:", error)
        return
      }

      if (data) {
        const activeUsers = filterOnlineUsers(data as UserPresence[])
        setOnlineUsers(activeUsers)

        // Filter users reviewing the current order item
        if (orderItemId) {
          const reviewing = activeUsers.filter(
            (p) => p.order_item_id === orderItemId && p.user_id !== user?.id,
          ) as UserPresence[]
          setReviewingUsers(reviewing)
        }
      }
    } catch (err) {
      console.error("[usePresence] Failed to fetch presence:", err)
    } finally {
      setLoading(false)
    }
  }, [orderItemId, user?.id, filterOnlineUsers])

  // Set up real-time subscription and heartbeat
  useEffect(() => {
    if (!user || !enableTracking || !supabaseRef.current) {
      setLoading(false)
      return
    }

    const supabase = supabaseRef.current

    // Initial presence upsert
    upsertPresence()

    // Fetch initial presence data
    fetchPresence()

    heartbeatIntervalRef.current = setInterval(() => {
      upsertPresence()
    }, HEARTBEAT_INTERVAL)

    cleanupIntervalRef.current = setInterval(() => {
      setOnlineUsers((prev) => filterOnlineUsers(prev))
      setReviewingUsers((prev) => filterOnlineUsers(prev))
    }, 5000)

    // Subscribe to presence changes
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
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const presence = payload.new as UserPresence

            if (!isUserOnline(presence.last_seen)) {
              return
            }

            // Update online users
            setOnlineUsers((prev) => {
              const filtered = prev.filter((p) => p.user_id !== presence.user_id)
              return [...filtered, presence]
            })

            // Update reviewing users if they're on the same order
            if (orderItemId && presence.order_item_id === orderItemId && presence.user_id !== user.id) {
              setReviewingUsers((prev) => {
                const filtered = prev.filter((p) => p.user_id !== presence.user_id)
                return [...filtered, presence]
              })
            } else if (orderItemId) {
              // Remove user from reviewing list if they switched to a different order
              setReviewingUsers((prev) => prev.filter((p) => p.user_id !== presence.user_id))
            }
          } else if (payload.eventType === "DELETE") {
            const presence = payload.old as UserPresence

            setOnlineUsers((prev) => prev.filter((p) => p.user_id !== presence.user_id))
            setReviewingUsers((prev) => prev.filter((p) => p.user_id !== presence.user_id))
          }
        },
      )
      .subscribe()

    const handleBeforeUnload = () => {
      // Use sendBeacon for more reliable cleanup when tab closes
      if (navigator.sendBeacon) {
        const presenceData = JSON.stringify({ user_id: user.id })
        navigator.sendBeacon(`${supabaseUrl}/rest/v1/user_presence?user_id=eq.${user.id}`, presenceData)
      }
      // Also try synchronous removal
      removePresence()
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    // Cleanup on unmount
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current)
      }
      window.removeEventListener("beforeunload", handleBeforeUnload)
      removePresence()
      supabase.removeChannel(channel)
    }
  }, [
    user,
    orderItemId,
    enableTracking,
    upsertPresence,
    fetchPresence,
    removePresence,
    filterOnlineUsers,
    isUserOnline,
  ])

  // Update presence when orderItemId changes
  useEffect(() => {
    if (user && enableTracking) {
      upsertPresence()
    }
  }, [orderItemId, user, enableTracking, upsertPresence])

  return {
    onlineUsers: onlineUsers.filter((p) => p.user_id !== user?.id), // Exclude current user
    reviewingUsers,
    loading,
    refresh: fetchPresence,
  }
}
