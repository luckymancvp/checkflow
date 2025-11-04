"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Database, ExternalLink, AlertTriangle, CheckCircle } from "lucide-react"
import { SyncStatusIndicator } from "@/components/sync-status-indicator"
import { googleSheetsClient } from "@/lib/google-sheets-client"
import type { Sheet } from "@/types/sheet"

interface SheetSelectorProps {
  sheets: Sheet[]
  selectedSheet: string | null
  loading: boolean
  onSheetSelect: (sheet: Sheet) => void
  onRefresh: () => void
  lastSync?: string
  syncStatus?: "idle" | "syncing" | "success" | "error"
  pendingChanges?: number
  syncError?: string | null
  onManualSync?: () => void
}

interface StatusCounts {
  [sheetId: string]: {
    [status: string]: number
  }
}

interface ColumnValidation {
  [sheetId: string]: {
    isValid: boolean
    missingColumns: string[]
    incorrectColumns: { expected: string; actual: string }[]
  }
}

export function SheetSelector({
  sheets,
  selectedSheet,
  loading,
  onSheetSelect,
  onRefresh,
  lastSync,
  syncStatus = "idle",
  pendingChanges = 0,
  syncError,
  onManualSync,
}: SheetSelectorProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({})
  const [loadingCounts, setLoadingCounts] = useState<{ [sheetId: string]: boolean }>({})
  const [statusLastSync, setStatusLastSync] = useState<string>("")
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false)
  const [columnValidation, setColumnValidation] = useState<ColumnValidation>({})

  const validateColumnHeaders = async (sheet: Sheet) => {
    try {
      const headerRow = sheet.configuration.dataRange.headerRow || 1
      const headerRange = `${sheet.tab_name}!${headerRow}:${headerRow}`
      const headerResult = await googleSheetsClient.getSheetData(sheet.google_sheet_id, headerRange)

      if (!headerResult.success || !headerResult.data?.values?.[0]) {
        return {
          isValid: false,
          missingColumns: [],
          incorrectColumns: [],
        }
      }

      const actualHeaders = headerResult.data.values[0]
      const expectedMapping = sheet.configuration.columnMapping
      const missingColumns: string[] = []
      const incorrectColumns: { expected: string; actual: string }[] = []

      // Check required fields (itemId, status, designer)
      const requiredFields = ["itemId", "status", "designer"]

      requiredFields.forEach((fieldKey) => {
        const expectedColumnName = expectedMapping[fieldKey as keyof typeof expectedMapping]
        if (expectedColumnName) {
          const foundHeader = actualHeaders.find(
            (header: string) => header && header.toLowerCase().trim() === expectedColumnName.toLowerCase().trim(),
          )

          if (!foundHeader) {
            missingColumns.push(expectedColumnName)
          }
        }
      })

      // Check all mapped columns for exact matches
      Object.entries(expectedMapping).forEach(([fieldKey, expectedColumnName]) => {
        if (expectedColumnName && expectedColumnName.trim()) {
          const foundHeader = actualHeaders.find(
            (header: string) => header && header.toLowerCase().trim() === expectedColumnName.toLowerCase().trim(),
          )

          if (!foundHeader) {
            // Find closest match for suggestions
            const closestMatch = actualHeaders.find(
              (header: string) =>
                header && header.toLowerCase().includes(expectedColumnName.toLowerCase().substring(0, 3)),
            )

            if (closestMatch && !missingColumns.includes(expectedColumnName)) {
              incorrectColumns.push({
                expected: expectedColumnName,
                actual: closestMatch,
              })
            }
          }
        }
      })

      return {
        isValid: missingColumns.length === 0 && incorrectColumns.length === 0,
        missingColumns,
        incorrectColumns,
      }
    } catch (error) {
      console.error(`[SheetSelector] Error validating columns for sheet ${sheet.id}:`, error)
      return {
        isValid: false,
        missingColumns: [],
        incorrectColumns: [],
      }
    }
  }

  const fetchStatusCounts = async (sheet: Sheet) => {
    try {
      const headerRow = sheet.configuration.dataRange.headerRow || 1
      const startRow = sheet.configuration.dataRange.startRow || headerRow + 1
      const statusFieldName = sheet.configuration.columnMapping.status

      const headerRange = `${sheet.tab_name}!${headerRow}:${headerRow}`
      const headerResult = await googleSheetsClient.getSheetData(sheet.google_sheet_id, headerRange)

      if (!headerResult.success || !headerResult.data?.values?.[0]) {
        console.error(`[SheetSelector] Could not read header row for sheet ${sheet.id}`)
        return {}
      }

      const headers = headerResult.data.values[0]
      const statusColumnIndex = headers.findIndex(
        (header: string) => header && header.toLowerCase().trim() === statusFieldName.toLowerCase().trim(),
      )

      if (statusColumnIndex === -1) {
        console.error(`[SheetSelector] Status column "${statusFieldName}" not found in headers:`, headers)
        return {}
      }

      const columnLetter = String.fromCharCode(65 + statusColumnIndex) // 65 is ASCII for 'A'

      const range = `${sheet.tab_name}!${columnLetter}${startRow}:${columnLetter}`

      const result = await googleSheetsClient.getSheetData(sheet.google_sheet_id, range)

      if (result.success && result.data?.values) {
        const statusValues = result.data.values.flat().filter(Boolean) // Remove empty values
        const counts: { [status: string]: number } = {}

        statusValues.forEach((status: string) => {
          counts[status] = (counts[status] || 0) + 1
        })

        return counts
      }

      return {}
    } catch (error) {
      console.error(`[SheetSelector] Error fetching status counts for sheet ${sheet.id}:`, error)
      return {}
    }
  }

  useEffect(() => {
    const loadStatusCounts = async () => {
      if (sheets.length === 0) return

      const initialLoadingState: { [sheetId: string]: boolean } = {}
      sheets.forEach((sheet) => {
        initialLoadingState[sheet.id] = true
      })
      setLoadingCounts(initialLoadingState)

      sheets.forEach(async (sheet) => {
        try {
          const [counts, validation] = await Promise.all([fetchStatusCounts(sheet), validateColumnHeaders(sheet)])

          setStatusCounts((prev) => ({
            ...prev,
            [sheet.id]: counts,
          }))

          setColumnValidation((prev) => ({
            ...prev,
            [sheet.id]: validation,
          }))

          setLoadingCounts((prev) => ({
            ...prev,
            [sheet.id]: false,
          }))
        } catch (error) {
          console.error(`[SheetSelector] Error loading status counts for sheet ${sheet.id}:`, error)
          setLoadingCounts((prev) => ({
            ...prev,
            [sheet.id]: false,
          }))
        }
      })

      setStatusLastSync(new Date().toISOString())
    }

    loadStatusCounts()
  }, [sheets])

  const handleRefreshStatusCounts = async () => {
    if (sheets.length === 0) return

    setIsRefreshingStatus(true)
    const initialLoadingState: { [sheetId: string]: boolean } = {}
    sheets.forEach((sheet) => {
      initialLoadingState[sheet.id] = true
    })
    setLoadingCounts(initialLoadingState)

    sheets.forEach(async (sheet) => {
      try {
        const [counts, validation] = await Promise.all([fetchStatusCounts(sheet), validateColumnHeaders(sheet)])

        setStatusCounts((prev) => ({
          ...prev,
          [sheet.id]: counts,
        }))

        setColumnValidation((prev) => ({
          ...prev,
          [sheet.id]: validation,
        }))

        setLoadingCounts((prev) => ({
          ...prev,
          [sheet.id]: false,
        }))
      } catch (error) {
        console.error(`[SheetSelector] Error refreshing status counts for sheet ${sheet.id}:`, error)
        setLoadingCounts((prev) => ({
          ...prev,
          [sheet.id]: false,
        }))
      }
    })

    setStatusLastSync(new Date().toISOString())
    setIsRefreshingStatus(false)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setIsRefreshing(false)
  }

  const renderStatusBadges = (sheetId: string) => {
    const counts = statusCounts[sheetId]
    const isLoading = loadingCounts[sheetId]

    if (isLoading) {
      return (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Loading...
        </div>
      )
    }

    if (!counts || Object.keys(counts).length === 0) {
      return <div className="text-xs text-gray-500">No data</div>
    }

    const getStatusColor = (status: string) => {
      switch (status.toUpperCase()) {
        case "NEW":
          return "bg-green-100 text-green-700"
        case "DESIGNED":
          return "bg-blue-100 text-blue-800"
        case "NEED_REPAIR":
        case "NEED REPAIR":
          return "bg-red-100 text-red-800"
        case "REPAIRED":
          return "bg-purple-100 text-purple-800"
        case "PENDING":
          return "bg-yellow-100 text-yellow-800"
        case "COMPLETED":
          return "bg-emerald-100 text-emerald-800"
        case "CANCELLED":
          return "bg-red-100 text-red-800"
        default:
          return "bg-gray-100 text-gray-800"
      }
    }

    const sortedEntries = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))

    return (
      <div className="flex flex-wrap gap-1">
        {sortedEntries.map(([status, count]) => (
          <Badge key={status} className={`text-xs px-2 py-1 ${getStatusColor(status)}`}>
            {status}: {count}
          </Badge>
        ))}
      </div>
    )
  }

  const formatLastSync = (timestamp?: string) => {
    if (!timestamp) return "Never"
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))

      if (diffMins < 1) return "Just now"
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
      return date.toLocaleDateString()
    } catch {
      return "Unknown"
    }
  }

  const getSheetStatus = (sheet: Sheet) => {
    return sheet.last_access ? "active" : "inactive"
  }

  const selectedSheetData = sheets.find((s) => s.id === selectedSheet)

  const renderColumnValidation = (sheetId: string) => {
    const validation = columnValidation[sheetId]
    const isLoading = loadingCounts[sheetId]

    if (isLoading || !validation) {
      return null
    }

    if (validation.isValid) {
      return null // Don't show anything for valid mappings, icon is enough
    }

    return (
      <div className="mb-2">
        <div className="flex items-center gap-1 text-xs text-red-600 mb-1">
          <AlertTriangle className="h-3 w-3" />
          <span>Column mapping issues detected</span>
        </div>

        {validation.missingColumns.length > 0 && (
          <div className="text-xs text-red-600 mb-1">
            <span className="font-medium">Missing columns:</span> {validation.missingColumns.join(", ")}
          </div>
        )}

        {validation.incorrectColumns.length > 0 && (
          <div className="text-xs text-orange-600">
            <span className="font-medium">Possible name changes:</span>
            {validation.incorrectColumns.map((col, index) => (
              <div key={index} className="ml-2">
                Expected "{col.expected}" → Found "{col.actual}"
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Select Google Sheet</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Status last sync: {formatLastSync(statusLastSync)}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshStatusCounts}
              disabled={isRefreshingStatus}
              className="h-8 px-3 border-gray-300 hover:bg-gray-50 bg-transparent"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshingStatus ? "animate-spin" : ""}`} />
              Refresh Status
            </Button>
          </div>
          <SyncStatusIndicator
            status={syncStatus}
            pendingChanges={pendingChanges}
            error={syncError}
            onManualSync={onManualSync}
          />
        </div>
      </div>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 You can select a sheet even while status counts are loading. Use the "Refresh Status" button to manually
          sync status counts.
        </p>
      </div>

      <div className="space-y-4">
        {sheets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sheets.map((sheet) => {
              const validation = columnValidation[sheet.id]
              const hasValidationIssues = validation && !validation.isValid
              const isLoadingValidation = loadingCounts[sheet.id]

              return (
                <Card
                  key={sheet.id}
                  className={`p-3 transition-all border-2 ${
                    hasValidationIssues
                      ? "opacity-50 cursor-not-allowed border-red-200 bg-red-50"
                      : selectedSheet === sheet.id
                        ? "border-blue-500 bg-blue-50 cursor-pointer hover:shadow-md"
                        : "border-gray-200 hover:border-gray-300 cursor-pointer hover:shadow-md"
                  }`}
                  onClick={() => {
                    if (hasValidationIssues) {
                      return
                    }
                    console.log("[SheetSelector] Selected sheet:", sheet)
                    onSheetSelect(sheet)
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-gray-600" />
                      <h3 className="font-medium text-base truncate">{sheet.name}</h3>
                      {columnValidation[sheet.id] &&
                        !loadingCounts[sheet.id] &&
                        (columnValidation[sheet.id].isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(`https://docs.google.com/spreadsheets/d/${sheet.google_sheet_id}/edit`, "_blank")
                        }}
                        aria-label="Open Google Sheet"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {sheet.description && <p className="text-xs text-gray-600 mb-2 line-clamp-2">{sheet.description}</p>}

                  {renderColumnValidation(sheet.id)}

                  <div className="mb-2 p-2 bg-gray-50 rounded">{renderStatusBadges(sheet.id)}</div>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Database className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No Google Sheets available</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm text-gray-600">Loading orders...</span>
          </div>
        )}
      </div>
    </Card>
  )
}
