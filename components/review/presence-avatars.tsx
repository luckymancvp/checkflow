"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { UserPresence } from "@/hooks/use-order-review-presence"
import type { GlobalUserPresence } from "@/hooks/use-global-presence"

interface PresenceAvatarsProps {
  users: (UserPresence | GlobalUserPresence)[]
  label?: string
  maxDisplay?: number
}

export function PresenceAvatars({ users, label = "reviewing", maxDisplay = 5 }: PresenceAvatarsProps) {
  const displayUsers = users.slice(0, maxDisplay)
  const remainingCount = Math.max(0, users.length - maxDisplay)

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const getStatusIndicator = (user: UserPresence | GlobalUserPresence) => {
    if ("status" in user && user.status === "typing") {
      return (
        <div
          className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white animate-pulse"
          title="Typing..."
        />
      )
    }
    return (
      <div className="absolute bottom-0 right-0 w-2 h-2 bg-blue-500 rounded-full border border-white" title="Active" />
    )
  }

  if (users.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 ml-4 border-l pl-4 border-gray-200">
      <div className="flex -space-x-2">
        {displayUsers.map((user) => (
          <div key={user.id} title={user.user_name} className="relative">
            <Avatar className="w-7 h-7 border-2 border-white">
              <AvatarImage src={user.user_avatar || undefined} alt={user.user_name} />
              <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                {getInitials(user.user_name)}
              </AvatarFallback>
            </Avatar>
            {getStatusIndicator(user)}
          </div>
        ))}
        {remainingCount > 0 && (
          <div
            className="relative w-7 h-7 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center"
            title={`+${remainingCount} more`}
          >
            <span className="text-xs font-semibold text-gray-600">+{remainingCount}</span>
          </div>
        )}
      </div>
      <span className="text-xs text-gray-500">
        {users.length} {label}
      </span>
    </div>
  )
}
