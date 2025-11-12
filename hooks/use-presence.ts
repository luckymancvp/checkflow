"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { useAuth } from "@/contexts/auth-context"
import type { RealtimeChannel } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export interface UserPresence {
  user_id: string
  user_name: string
  user_avatar: string | null
  user_email: string | null
  order_item_id: string | null
  status: "online"
  online_at: number
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
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  console.log("[v0] usePresence initialized", {
    userId: user?.id,
    orderItemId,
    enableTracking,
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseKey: !!supabaseAnonKey,
  })

  // Initialize Supabase client once
  useEffect(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey)
      console.log("[v0] Supabase client created")
    }
  }, [])

  useEffect(() => {
    if (!user || !enableTracking || !supabaseRef.current) {
      console.log("[v0] Presence tracking disabled", {
        hasUser: !!user,
        enableTracking,
        hasSupabase: !!supabaseRef.current,
      })
      setLoading(false)
      return
    }

    console.log("[v0] Setting up presence channel for user:", user.id)
    const supabase = supabaseRef.current

    const channel = supabase.channel("global-presence", {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    channel
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState()
        console.log("[v0] Presence sync event", { presenceState })

        const allUsers: UserPresence[] = []

        Object.keys(presenceState).forEach((userId) => {
          const presences = presenceState[userId] as any[]
          if (presences && presences.length > 0) {
            const presence = presences[0]
            allUsers.push({
              user_id: userId,
              user_name: presence.user_name,
              user_avatar: presence.user_avatar,
              user_email: presence.user_email,
              order_item_id: presence.order_item_id,
              status: "online",
              online_at: presence.online_at,
            })
          }
        })

        console.log("[v0] All users from presence:", allUsers)

        const others = allUsers.filter((u) => u.user_id !== user.id)
        console.log("[v0] Other users (excluding self):", others)
        setOnlineUsers(others)

        if (orderItemId) {
          const reviewing = others.filter((u) => u.order_item_id === orderItemId)
          console.log("[v0] Users reviewing same order:", reviewing)
          setReviewingUsers(reviewing)
        } else {
          setReviewingUsers([])
        }

        setLoading(false)
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        console.log("[v0] User joined presence:", newPresences)
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        console.log("[v0] User left presence:", leftPresences)
      })
      .subscribe(async (status) => {
        console.log("[v0] Channel subscription status:", status)

        if (status === "SUBSCRIBED") {
          const trackData = {
            user_id: user.id,
            user_name: user.name,
            user_avatar: user.avatar_url || null,
            user_email: user.email,
            order_item_id: orderItemId,
            online_at: Date.now(),
          }
          console.log("[v0] Tracking presence with data:", trackData)

          await channel.track(trackData)
          console.log("[v0] Presence tracked successfully")
        }
      })

    channelRef.current = channel

    return () => {
      console.log("[v0] Cleaning up presence channel")
      channel.untrack()
      channel.unsubscribe()
    }
  }, [user, orderItemId, enableTracking])

  useEffect(() => {
    if (!user || !enableTracking || !channelRef.current) return

    const channel = channelRef.current

    const trackData = {
      user_id: user.id,
      user_name: user.name,
      user_avatar: user.avatar_url || null,
      user_email: user.email,
      order_item_id: orderItemId,
      online_at: Date.now(),
    }

    console.log("[v0] Updating presence for order item change:", trackData)
    channel.track(trackData)
  }, [orderItemId, user, enableTracking])

  const refresh = useCallback(() => {
    // Presence syncs automatically, no manual refresh needed
  }, [])

  return {
    onlineUsers,
    reviewingUsers,
    loading,
    refresh,
  }
}
