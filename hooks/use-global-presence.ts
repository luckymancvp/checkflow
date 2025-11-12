"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { useAuth } from "@/contexts/auth-context"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const presenceIdRef = useRef<string | null>(null)

  // Upsert current user's global presence
  const updatePresence = useCallback(
    async (status: "online" | "idle" = "online") => {
      if (!user || !enabled) return

      const supabase = createClient(supabaseUrl, supabaseAnonKey)

      try {
        const { data, error } = await supabase
          .from("global_user_presence")
          .upsert(
            {
              user_id: user.id || user.email,
              user_email: user.email,
              user_name: user.name,
              user_avatar: user.avatar_url || null,
              status,
              last_activity: new Date().toISOString(),
            },
            {
              onConflict: "user_email",
            },
          )
          .select()
          .single()

        if (error) {
          console.error("[useGlobalPresence] Error updating presence:", error)
          return
        }

        if (data) {
          presenceIdRef.current = data.id
        }
      } catch (error) {
        console.error("[useGlobalPresence] Error upserting presence:", error)
      }
    },
    [user, enabled],
  )

  // Fetch initial online users
  const fetchOnlineUsers = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    try {
      setLoading(true)
      // Consider users online if they updated within last 2 minutes
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from("global_user_presence")
        .select("*")
        .gt("updated_at", twoMinutesAgo)
        .order("last_activity", { ascending: false })

      if (error) {
        console.error("[useGlobalPresence] Error fetching users:", error)
        return
      }

      setOnlineUsers(data || [])
    } catch (error) {
      console.error("[useGlobalPresence] Error fetching online users:", error)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  // Set up real-time subscription for global presence
  useEffect(() => {
    if (!enabled || !user) {
      setLoading(false)
      return
    }

    fetchOnlineUsers()

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const channel = supabase
      .channel("global-user-presence")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "global_user_presence",
        },
        (payload) => {
          console.log("[v0] Global presence update:", payload)

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const updatedUser = payload.new as GlobalUserPresence

            setOnlineUsers((prev) => {
              const exists = prev.some((u) => u.id === updatedUser.id)
              if (exists) {
                return prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
              }
              return [...prev, updatedUser]
            })
          } else if (payload.eventType === "DELETE") {
            const deletedUser = payload.old as GlobalUserPresence
            setOnlineUsers((prev) => prev.filter((u) => u.id !== deletedUser.id))
          }
        },
      )
      .subscribe()

    // Update presence immediately
    updatePresence("online")

    heartbeatIntervalRef.current = setInterval(() => {
      updatePresence("online")
    }, 3000)

    // Cleanup on unmount
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }

      const cleanup = async () => {
        if (presenceIdRef.current) {
          await supabase.from("global_user_presence").delete().eq("id", presenceIdRef.current)
        }
      }

      cleanup()
      supabase.removeChannel(channel)
    }
  }, [user, enabled, fetchOnlineUsers, updatePresence])

  return {
    onlineUsers: onlineUsers.filter((u) => u.user_email !== user?.email), // Exclude current user
    loading,
    updatePresence,
  }
}
