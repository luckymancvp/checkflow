"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Loader2, AlertTriangle, FileSpreadsheet, BarChart3, RefreshCw } from "lucide-react"
import type { SheetConfiguration } from "../add-sheet-modal"
import { googleSheetsClient } from "@/lib/google-sheets-client"

interface SheetSelectionStepProps {
  configuration: SheetConfiguration
  updateConfiguration: (updates: Partial<SheetConfiguration>) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

interface SheetTab {
  properties: {
    title: string
    sheetId: number
    gridProperties: {
      rowCount: number
      columnCount: number
    }
  }
}

interface SheetMetadata {
  spreadsheetId: string
  properties: {
    title: string
  }
  sheets: SheetTab[]
}

export function SheetSelectionStep({
  configuration,
  updateConfiguration,
  isLoading,
  setIsLoading,
}: SheetSelectionStepProps) {
  const [loadingSheets, setLoadingSheets] = useState(false)
  const [sheetsError, setSheetsError] = useState<string | null>(null)
  const [sheetMetadata, setSheetMetadata] = useState<SheetMetadata | null>(null)

  const loadSheetMetadata = async () => {
    if (!configuration.googleSheetId) {
      return
    }

    setLoadingSheets(true)
    setSheetsError(null)

    try {
      const response = await googleSheetsClient.getSpreadsheet(configuration.googleSheetId)

      if (!response.success) {
        if (response.error?.includes("403")) {
          throw new Error(
            "Access denied. Please check sheet permissions and ensure it's shared with the system account.",
          )
        } else if (response.error?.includes("404")) {
          throw new Error("Sheet not found. Please verify the Google Sheets URL is correct.")
        } else {
          throw new Error(response.error || "Failed to load sheet data")
        }
      }

      const metadata: SheetMetadata = response.data
      setSheetMetadata(metadata)
      updateConfiguration({ sheetMetadata: metadata })

      if (!configuration.selectedTab && metadata.sheets.length > 0) {
        const orderTab = metadata.sheets.find((sheet) => sheet.properties.title.toLowerCase() === "order")

        if (orderTab) {
          updateConfiguration({ selectedTab: orderTab.properties.title })
        } else {
          updateConfiguration({ selectedTab: metadata.sheets[0].properties.title })
        }
      }
    } catch (error) {
      setSheetsError(error instanceof Error ? error.message : "Failed to load sheet data")
      setSheetMetadata(null)
      updateConfiguration({ sheetMetadata: undefined })
    } finally {
      setLoadingSheets(false)
    }
  }

  useEffect(() => {
    if (configuration.googleSheetId) {
      loadSheetMetadata()
    }
  }, [configuration.googleSheetId])

  const getRowCountWarning = (rowCount: number) => {
    if (rowCount > 10000) {
      return { level: "high", message: "Very large sheet - may impact performance significantly" }
    } else if (rowCount > 5000) {
      return { level: "medium", message: "Large sheet - consider using row-based sync for better performance" }
    } else if (rowCount > 1000) {
      return { level: "low", message: "Medium sheet - good performance expected" }
    }
    return null
  }

  const selectedSheet = sheetMetadata?.sheets.find((sheet) => sheet.properties.title === configuration.selectedTab)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-sm font-medium mr-3">
              2
            </div>
            Sheet Selection
          </CardTitle>
          <CardDescription>Choose which tab to sync from your Google Sheet</CardDescription>
        </CardHeader>
        <CardContent>
          {sheetMetadata && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="font-medium text-blue-900">{sheetMetadata.properties.title}</div>
                  <div className="text-sm text-blue-700">
                    {sheetMetadata.sheets.length} tab{sheetMetadata.sheets.length !== 1 ? "s" : ""} available
                  </div>
                </div>
              </div>
            </div>
          )}

          {loadingSheets && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-pink-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading sheet tabs...</p>
              </div>
            </div>
          )}

          {sheetsError && (
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                <div className="font-medium mb-1">Failed to Load Sheet</div>
                <div className="text-sm mb-2">{sheetsError}</div>
                <Button variant="outline" size="sm" onClick={loadSheetMetadata} className="bg-white hover:bg-gray-50">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {sheetMetadata && !loadingSheets && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Select Sheet Tab</Label>
                <Button variant="outline" size="sm" onClick={loadSheetMetadata} disabled={loadingSheets}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <RadioGroup
                value={configuration.selectedTab}
                onValueChange={(value) => updateConfiguration({ selectedTab: value })}
                className="space-y-3"
              >
                {sheetMetadata.sheets.map((sheet) => {
                  const warning = getRowCountWarning(sheet.properties.gridProperties.rowCount)

                  return (
                    <div key={sheet.properties.sheetId} className="flex items-center space-x-3">
                      <RadioGroupItem value={sheet.properties.title} id={`sheet-${sheet.properties.sheetId}`} />
                      <Label htmlFor={`sheet-${sheet.properties.sheetId}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <FileSpreadsheet className="h-5 w-5 text-gray-400" />
                            <div>
                              <div className="font-medium">{sheet.properties.title}</div>
                              <div className="text-sm text-gray-600 flex items-center space-x-4">
                                <span className="flex items-center">
                                  <BarChart3 className="h-3 w-3 mr-1" />
                                  {sheet.properties.gridProperties.rowCount.toLocaleString()} rows
                                </span>
                                <span>{sheet.properties.gridProperties.columnCount} columns</span>
                              </div>
                            </div>
                          </div>

                          {warning && (
                            <Badge
                              variant={warning.level === "high" ? "destructive" : "secondary"}
                              className={
                                warning.level === "high"
                                  ? "bg-red-100 text-red-800 border-red-200"
                                  : warning.level === "medium"
                                    ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                    : "bg-blue-100 text-blue-800 border-blue-200"
                              }
                            >
                              {warning.level === "high" ? "Large" : warning.level === "medium" ? "Medium" : "Small"}
                            </Badge>
                          )}
                        </div>
                      </Label>
                    </div>
                  )
                })}
              </RadioGroup>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSheet && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selected Sheet Preview</CardTitle>
            <CardDescription>Information about the selected sheet tab</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {selectedSheet.properties.gridProperties.rowCount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Rows</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {selectedSheet.properties.gridProperties.columnCount}
                </div>
                <div className="text-sm text-gray-600">Columns</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round(
                    (selectedSheet.properties.gridProperties.rowCount *
                      selectedSheet.properties.gridProperties.columnCount) /
                      1000,
                  )}
                  K
                </div>
                <div className="text-sm text-gray-600">Total Cells</div>
              </div>
            </div>

            {(() => {
              const warning = getRowCountWarning(selectedSheet.properties.gridProperties.rowCount)
              if (warning) {
                return (
                  <Alert
                    className={`mt-4 ${
                      warning.level === "high"
                        ? "border-red-200 bg-red-50"
                        : warning.level === "medium"
                          ? "border-yellow-200 bg-yellow-50"
                          : "border-blue-200 bg-blue-50"
                    }`}
                  >
                    <AlertTriangle
                      className={`h-4 w-4 ${
                        warning.level === "high"
                          ? "text-red-600"
                          : warning.level === "medium"
                            ? "text-yellow-600"
                            : "text-blue-600"
                      }`}
                    />
                    <AlertDescription
                      className={
                        warning.level === "high"
                          ? "text-red-700"
                          : warning.level === "medium"
                            ? "text-yellow-700"
                            : "text-blue-700"
                      }
                    >
                      <div className="font-medium mb-1">Performance Notice</div>
                      <div className="text-sm">{warning.message}</div>
                    </AlertDescription>
                  </Alert>
                )
              }
              return null
            })()}
          </CardContent>
        </Card>
      )}

      <Card className="border-gray-200">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Step 2 Requirements</h4>
            <div className="space-y-1">
              <div className="flex items-center text-sm">
                {sheetMetadata ? (
                  <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center mr-2">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 mr-2" />
                )}
                Sheet data loaded successfully
              </div>
              <div className="flex items-center text-sm">
                {configuration.selectedTab ? (
                  <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center mr-2">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 mr-2" />
                )}
                Sheet tab selected
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
