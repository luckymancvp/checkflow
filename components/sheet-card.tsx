"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Edit, Trash2, ExternalLink } from "lucide-react"

export interface SheetUser {
  id: string
  name: string
  email: string
  role: string
  avatar_url: string
}

export interface Sheet {
  id: string
  name: string
  description: string
  google_sheet_id: string
  tab_name: string
  configuration: {
    syncStrategy: "date-based" | "row-based"
    syncRange: string
    columnMapping: {
      itemId: string
      status: string
      orderNote: string
      designer: string
      design: string
      mockup: string
      customerImage: string
      personalization: string
      date: string
      store: string
      image: string
      productType: string
      productName: string
    }
    dataRange: {
      startRow: number
      endRow: number | null
      headerRow: number
      columns: string
    }
    readDirection: "top-to-bottom" | "bottom-to-top"
    maxRowsPerLoad: number
  }
  last_access: string | null
  created_at: string
  updated_at: string
  createdBy: SheetUser
}

interface SheetCardProps {
  sheet: Sheet
  onEdit: (sheet: Sheet) => void
  onDelete: (id: string) => void
}

export function SheetCard({ sheet, onEdit, onDelete }: SheetCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatLastAccess = (lastAccess: string | null) => {
    if (!lastAccess) return "Never"

    const now = new Date()
    const accessTime = new Date(lastAccess)
    const diffInMinutes = Math.floor((now.getTime() - accessTime.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hours ago`

    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} days ago`
  }

  const getStatusColor = () => {
    // Simple status logic - can be enhanced based on actual status determination
    if (!sheet.last_access) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    return "bg-green-100 text-green-800 border-green-200"
  }

  const getStatusText = () => {
    if (!sheet.last_access) return "Not Used"
    return "Active"
  }

  // Construct Google Sheets URL from sheet ID
  const googleSheetsUrl = `https://docs.google.com/spreadsheets/d/${sheet.google_sheet_id}/edit`

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-1">{sheet.name}</CardTitle>
            {sheet.description && (
              <CardDescription className="text-sm text-gray-600">{sheet.description}</CardDescription>
            )}
          </div>
          <Badge className={`${getStatusColor()} font-medium`}>{getStatusText()}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Sheet Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Tab:</span>
            <span className="ml-2 text-gray-600">{sheet.tab_name}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Strategy:</span>
            <span className="ml-2 text-gray-600 capitalize">{sheet.configuration.syncStrategy.replace("-", " ")}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Range:</span>
            <span className="ml-2 text-gray-600">{sheet.configuration.syncRange}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Max Rows:</span>
            <span className="ml-2 text-gray-600">{sheet.configuration.maxRowsPerLoad}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Mockup:</span>
            <span className="ml-2 text-gray-600">{sheet.configuration.columnMapping.mockup}</span>
          </div>
        </div>

        {/* Last Access */}
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="h-4 w-4 mr-2" />
          <span>Last Access: {formatLastAccess(sheet.last_access)}</span>
        </div>

        {/* Creator Information */}
        <div className="flex items-center space-x-3 pt-2 border-t border-gray-100">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            {sheet.createdBy.avatar_url ? (
              <img
                src={sheet.createdBy.avatar_url || "/placeholder.svg"}
                alt={sheet.createdBy.name}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <span className="text-xs font-medium text-gray-600">{sheet.createdBy.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{sheet.createdBy.name}</div>
            <div className="text-xs text-gray-500 truncate">{sheet.createdBy.email}</div>
          </div>
          <div className="text-xs text-gray-500">{formatDate(sheet.created_at)}</div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(sheet)}
              className="text-gray-700 hover:text-gray-900"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(sheet.id)}
              className="text-red-600 hover:text-red-700 hover:border-red-300"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(googleSheetsUrl, "_blank")}
            className="text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Open Sheet
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
