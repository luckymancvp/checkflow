"use client"

import { CheckCircle, AlertCircle, Loader2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SyncStatusIndicatorProps {
  status: "idle" | "syncing" | "success" | "error"
  pendingChanges: number
  error?: string | null
  onManualSync?: () => void
}

export function SyncStatusIndicator({ status, pendingChanges, error, onManualSync }: SyncStatusIndicatorProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "syncing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "idle":
        return pendingChanges > 0 ? <Clock className="h-4 w-4 text-yellow-500" /> : null
      default:
        return null
    }
  }

  const getStatusText = () => {
    switch (status) {
      case "syncing":
        return "Syncing..."
      case "success":
        return "Saved"
      case "error":
        return "Sync Failed"
      case "idle":
        return pendingChanges > 0 ? "Pending" : ""
      default:
        return ""
    }
  }

  const getTooltipContent = () => {
    switch (status) {
      case "syncing":
        return `Syncing ${pendingChanges} change${pendingChanges !== 1 ? "s" : ""} to Google Sheets...`
      case "success":
        return "All changes have been saved successfully"
      case "error":
        return error || "Failed to sync changes. Click to retry."
      case "idle":
        return pendingChanges > 0
          ? `${pendingChanges} change${pendingChanges !== 1 ? "s" : ""} will sync automatically after 5 seconds of inactivity`
          : "All changes are saved"
      default:
        return ""
    }
  }

  if (status === "idle" && pendingChanges === 0) {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">{getStatusText()}</span>
            {pendingChanges > 0 && (
              <Badge variant="secondary" className="text-xs">
                {pendingChanges}
              </Badge>
            )}
            {status === "error" && onManualSync && (
              <Button size="sm" variant="outline" onClick={onManualSync} className="h-6 px-2 text-xs bg-transparent">
                Retry
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
