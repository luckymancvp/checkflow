"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { useAuth } from "@/contexts/auth-context"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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

export function useOrderReviewPresence(itemId: string, enabled = true) {
  const [reviewingUsers, setReviewingUsers] = useState<UserPresence[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const presenceIdRef = useRef<string | null>(null)

  // Upsert current user's presence
  const updatePresence = useCallback(
    async (status: "reviewing" | "idle" | "typing" = "reviewing") => {
      if (!user || !enabled) return

      const supabase = createClient(supabaseUrl, supabaseAnonKey)

      try {
        const { data, error } = await supabase
          .from("order_review_presence")
          .upsert(
            {
              order_item_id: itemId,
              user_id: user.id || user.email,
              user_email: user.email,
              user_name: user.name,
              user_avatar: user.avatar_url || null,
              status,
              last_activity: new Date().toISOString(),
            },
            {
              onConflict: "order_item_id,user_email",
            },
          )
          .select()
          .single()

        if (error) {
          console.error("[useOrderReviewPresence] Error updating presence:", error)
          return
        }

        if (data) {
          presenceIdRef.current = data.id
        }
      } catch (error) {
        console.error("[useOrderReviewPresence] Error upserting presence:", error)
      }
    },
    [itemId, user, enabled],
  )

  // Fetch initial reviewing users
  const fetchReviewingUsers = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    try {
      setLoading(true)
      // Consider users active if they updated within last 2 minutes
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from("order_review_presence")
        .select("*")
        .eq("order_item_id", itemId)
        .gt("updated_at", twoMinutesAgo)
        .order("last_activity", { ascending: false })

      if (error) {
        console.error("[useOrderReviewPresence] Error fetching users:", error)
        return
      }

      setReviewingUsers(data || [])
    } catch (error) {
      console.error("[useOrderReviewPresence] Error fetching reviewing users:", error)
    } finally {
      setLoading(false)
    }
  }, [itemId, enabled])

  // Set up real-time subscription
  useEffect(() => {
    if (!enabled || !user) {
      setLoading(false)
      return
    }

    fetchReviewingUsers()

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const channel = supabase
      .channel(`order-review-presence-${itemId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_review_presence",
          filter: `order_item_id=eq.${itemId}`,
        },
        (payload) => {
          console.log("[v0] Presence update:", payload)

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const updatedUser = payload.new as UserPresence

            setReviewingUsers((prev) => {
              const exists = prev.some((u) => u.id === updatedUser.id)
              if (exists) {
                return prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
              }
              return [...prev, updatedUser]
            })
          } else if (payload.eventType === "DELETE") {
            const deletedUser = payload.old as UserPresence
            setReviewingUsers((prev) => prev.filter((u) => u.id !== deletedUser.id))
          }
        },
      )
      .subscribe()

    // Update presence immediately
    updatePresence("reviewing")

    heartbeatIntervalRef.current = setInterval(() => {
      updatePresence("reviewing")
    }, 30000)

    // Cleanup on unmount
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }

      const cleanup = async () => {
        if (presenceIdRef.current) {
          await supabase.from("order_review_presence").delete().eq("id", presenceIdRef.current)
        }
      }

      cleanup()
      supabase.removeChannel(channel)
    }
  }, [itemId, user, enabled, fetchReviewingUsers, updatePresence])

  // Update status when user interacts with order note
  const setTypingStatus = useCallback(() => {
    updatePresence("typing")
  }, [updatePresence])

  return {
    reviewingUsers: reviewingUsers.filter((u) => u.user_email !== user?.email), // Exclude current user
    loading,
    updatePresence,
    setTypingStatus,
  }
}
