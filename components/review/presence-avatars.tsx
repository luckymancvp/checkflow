"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { UserPresence } from "@/hooks/use-presence"
import { Users } from "lucide-react"

interface PresenceAvatarsProps {
  users: UserPresence[]
  maxDisplay?: number
  label?: string
}

export function PresenceAvatars({ users, maxDisplay = 5, label }: PresenceAvatarsProps) {
  const displayUsers = users.slice(0, maxDisplay)
  const remainingCount = users.length - maxDisplay

  if (users.length === 0) {
    return null
  }

  const getInitials = (name: string) => {
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2">
        {label && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Users className="h-3.5 w-3.5" />
            <span className="font-medium">{label}:</span>
          </div>
        )}
        <div className="flex items-center -space-x-2">
          {displayUsers.map((user) => (
            <Tooltip key={user.user_id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="h-7 w-7 border-2 border-white ring-1 ring-gray-200 hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer">
                    <AvatarImage src={user.user_avatar || undefined} alt={user.user_name} />
                    <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {getInitials(user.user_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div className="space-y-1">
                  <p className="font-semibold">{user.user_name}</p>
                  {user.user_email && <p className="text-gray-400">{user.user_email}</p>}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center h-7 w-7 rounded-full bg-gray-200 border-2 border-white text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-300 transition-colors">
                  +{remainingCount}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div className="space-y-1">
                  {users.slice(maxDisplay).map((user) => (
                    <p key={user.user_id}>{user.user_name}</p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
