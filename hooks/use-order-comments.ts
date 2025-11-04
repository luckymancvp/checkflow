"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import { useAuth } from "@/contexts/auth-context"
import type { OrderComment, CommentResponse, CreateCommentRequest } from "@/types/comment"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function useOrderComments(itemId: string) {
  const [comments, setComments] = useState<OrderComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { user, getToken } = useAuth()

  // Fetch comments
  const fetchComments = useCallback(async () => {
    const token = getToken()
    if (!user || !token) {
      setError("User not authenticated")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/comments/${itemId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const result: CommentResponse = await response.json()

      if (result.success) {
        setComments(result.data)
        setError(null)
      } else {
        setError(result.error || "Failed to fetch comments")
      }
    } catch (err) {
      setError("Failed to fetch comments")
      console.error("[useOrderComments] Error fetching comments:", err)
    } finally {
      setLoading(false)
    }
  }, [itemId, user, getToken])

  // Post a new comment
  const postComment = useCallback(
    async (commentData: CreateCommentRequest) => {
      const token = getToken()
      if (!user || !token) {
        setError("User not authenticated")
        return false
      }

      try {
        setSubmitting(true)
        const response = await fetch(`/api/comments/${itemId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(commentData),
        })

        const result = await response.json()

        if (result.success) {
          const newComment = result.data as OrderComment
          setComments((prev) => [...prev, newComment])
          return true
        } else {
          setError(result.error || "Failed to post comment")
          return false
        }
      } catch (err) {
        setError("Failed to post comment")
        console.error("[useOrderComments] Error posting comment:", err)
        return false
      } finally {
        setSubmitting(false)
      }
    },
    [itemId, user, getToken],
  )

  // Set up real-time subscription
  useEffect(() => {
    if (user) {
      fetchComments()
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const channel = supabase
      .channel(`order-comments-${itemId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_comments",
          filter: `order_item_id=eq.${itemId}`,
        },
        (payload) => {
          console.log("[useOrderComments] Real-time update:", payload)

          if (payload.eventType === "INSERT") {
            const newComment = payload.new as OrderComment
            setComments((prev) => {
              const exists = prev.some((c) => c.id === newComment.id)
              if (exists) return prev
              return [...prev, newComment]
            })

            // Show browser notification
            if (Notification.permission === "granted") {
              new Notification("New Comment", {
                body: `${newComment.user_name}: ${newComment.comment_text.substring(0, 100)}`,
                icon: newComment.user_avatar || "/placeholder.svg?height=48&width=48&text=User",
              })
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedComment = payload.new as OrderComment
            setComments((prev) => prev.map((c) => (c.id === updatedComment.id ? updatedComment : c)))
          } else if (payload.eventType === "DELETE") {
            const deletedComment = payload.old as OrderComment
            setComments((prev) => prev.filter((c) => c.id !== deletedComment.id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [itemId, fetchComments, user])

  return {
    comments,
    loading,
    error,
    submitting,
    postComment,
    refetch: fetchComments,
  }
}
