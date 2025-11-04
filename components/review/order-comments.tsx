"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageSquare, Bell, BellOff, ChevronDown, ChevronUp } from "lucide-react"
import { useOrderComments } from "@/hooks/use-order-comments"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/contexts/auth-context"

interface OrderCommentsProps {
  itemId: string
}

export function OrderComments({ itemId }: OrderCommentsProps) {
  const { user } = useAuth()
  const { comments, loading, error, submitting, postComment } = useOrderComments(itemId)
  const [commentText, setCommentText] = useState("")
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasLoadedComments, setHasLoadedComments] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsExpanded(false)
    setHasLoadedComments(false)
    setCommentText("")
  }, [itemId])

  useEffect(() => {
    if (!loading && !hasLoadedComments) {
      setHasLoadedComments(true)
      if (comments.length > 0) {
        setIsExpanded(true)
      }
    }
  }, [loading, comments.length, hasLoadedComments])

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted")
    }
  }, [])

  const handleRequestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support notifications")
      return
    }

    const permission = await Notification.requestPermission()
    setNotificationsEnabled(permission === "granted")

    if (permission === "granted") {
      new Notification("Notifications Enabled", {
        body: "You will now receive notifications for new comments",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!commentText.trim() || !user) return

    const success = await postComment({
      comment_text: commentText.trim(),
      user_name: user.name,
      user_email: user.email,
      user_avatar: user.avatar_url || null,
    })

    if (success) {
      setCommentText("")
      if (!isExpanded) {
        setIsExpanded(true)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const sortedComments = [...comments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return (
    <div className="border-b border-gray-200">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 hover:bg-gray-50 rounded px-2 py-1 -ml-2 transition-colors"
          >
            <MessageSquare className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Discussion</h3>
            {loading ? (
              <span className="text-xs text-gray-400">(Loading...)</span>
            ) : comments.length > 0 ? (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{comments.length}</span>
            ) : (
              <span className="text-xs text-gray-400">(No comments)</span>
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRequestNotificationPermission}
            className={`h-7 w-7 p-0 ${notificationsEnabled ? "text-blue-600 hover:bg-blue-50" : "text-gray-400 hover:bg-gray-100"}`}
            title={notificationsEnabled ? "Notifications enabled" : "Enable notifications"}
          >
            {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </Button>
        </div>

        {isExpanded && (
          <>
            <div className="space-y-3 max-h-[400px] overflow-y-auto mb-4">
              {loading && comments.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-4">Loading comments...</div>
              ) : error ? (
                <div className="text-xs text-red-600 text-center py-4">{error}</div>
              ) : comments.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                  No comments yet. Start the discussion!
                </div>
              ) : (
                sortedComments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 bg-gray-50 rounded-lg p-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={comment.user_avatar || undefined} alt={comment.user_name} />
                      <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                        {getInitials(comment.user_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-900">{comment.user_name}</span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap break-words">{comment.comment_text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSubmit}>
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  user ? "Add a comment... (Press Enter to send, Shift+Enter for new line)" : "Please log in to comment"
                }
                rows={3}
                className="text-xs border-gray-200 focus:border-blue-300 focus:ring-blue-200 resize-none"
                disabled={submitting || !user}
              />
            </form>
          </>
        )}
      </div>
    </div>
  )
}
