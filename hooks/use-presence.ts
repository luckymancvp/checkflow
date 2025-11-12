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
  status: "online"
  last_seen: string
}

interface UsePresenceOptions {
  orderItemId?: string | null
  enableTracking?: boolean
}

export function usePresence(options: UsePresenceOptions = {}) {
  const { orderItemId = null, enableTracking = true } = options
  const { user, getToken } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([])
  const [reviewingUsers, setReviewingUsers] = useState<UserPresence[]>([])
  const [loading, setLoading] = useState(true)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const presenceIdRef = useRef<string | null>(null)

  // Fetch all presence data
  const fetchPresence = useCallback(async () => {
    const token = getToken()
    if (!user || !token) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/presence", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const result = await response.json()

      if (result.success) {
        const allUsers = result.data as UserPresence[]
        const others = allUsers.filter((u) => u.user_id !== user.id)
        setOnlineUsers(others)

        if (orderItemId) {
          const reviewing = others.filter((u) => u.order_item_id === orderItemId)
          setReviewingUsers(reviewing)
        } else {
          setReviewingUsers([])
        }
      }
    } catch (err) {
      console.error("[v0] Error fetching presence:", err)
    } finally {
      setLoading(false)
    }
  }, [user, getToken, orderItemId])

  // Update presence
  const updatePresence = useCallback(async () => {
    const token = getToken()
    if (!user || !token || !enableTracking) return

    try {
      const response = await fetch("/api/presence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_item_id: orderItemId,
        }),
      })

      const result = await response.json()
      if (result.success && result.data) {
        presenceIdRef.current = result.data.id
      }
    } catch (err) {
      console.error("[v0] Error updating presence:", err)
    }
  }, [user, getToken, orderItemId, enableTracking])

  // Remove presence
  const removePresence = useCallback(async () => {
    const token = getToken()
    if (!user || !token) return

    try {
      await fetch("/api/presence", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    } catch (err) {
      console.error("[v0] Error removing presence:", err)
    }
  }, [user, getToken])

  // Set up realtime subscription and heartbeat
  useEffect(() => {
    if (!user || !enableTracking) {
      setLoading(false)
      return
    }

    // Initial presence update
    updatePresence()
    fetchPresence()

    // Set up heartbeat to keep presence alive
    heartbeatIntervalRef.current = setInterval(() => {
      updatePresence()
    }, 20000) // Update every 20 seconds

    // Set up realtime subscription
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const channel = supabase
      .channel("user-presence-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
        },
        (payload) => {
          console.log("[v0] Presence realtime update:", payload)

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const presence = payload.new as UserPresence

            // Don't show current user in lists
            if (presence.user_id === user.id) return

            setOnlineUsers((prev) => {
              const filtered = prev.filter((u) => u.user_id !== presence.user_id)
              return [...filtered, presence]
            })

            if (orderItemId && presence.order_item_id === orderItemId) {
              setReviewingUsers((prev) => {
                const filtered = prev.filter((u) => u.user_id !== presence.user_id)
                return [...filtered, presence]
              })
            } else if (orderItemId) {
              // Remove from reviewing list if they switched to a different order
              setReviewingUsers((prev) => prev.filter((u) => u.user_id !== presence.user_id))
            }
          } else if (payload.eventType === "DELETE") {
            const presence = payload.old as UserPresence
            setOnlineUsers((prev) => prev.filter((u) => u.user_id !== presence.user_id))
            setReviewingUsers((prev) => prev.filter((u) => u.user_id !== presence.user_id))
          }
        },
      )
      .subscribe()

    // Clean up on unmount or tab close
    const cleanup = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
      removePresence()
    }

    // Handle page unload/close with sendBeacon for reliable cleanup
    const handleBeforeUnload = () => {
      const token = getToken()
      if (token && user) {
        // Use sendBeacon for reliable cleanup on tab close
        navigator.sendBeacon(
          "/api/presence",
          JSON.stringify({
            _method: "DELETE",
            Authorization: token,
          }),
        )
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      cleanup()
      supabase.removeChannel(channel)
    }
  }, [user, orderItemId, enableTracking, updatePresence, fetchPresence, removePresence, getToken])

  return {
    onlineUsers,
    reviewingUsers,
    loading,
    refresh: fetchPresence,
  }
}
