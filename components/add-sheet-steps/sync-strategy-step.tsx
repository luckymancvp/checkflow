"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Calendar, BarChart3, Clock, Zap, AlertTriangle, CheckCircle } from "lucide-react"
import type { SheetConfiguration } from "../add-sheet-modal"

interface SyncStrategyStepProps {
  configuration: SheetConfiguration
  updateConfiguration: (updates: Partial<SheetConfiguration>) => void
}

const DATE_BASED_OPTIONS = [
  { value: "7-days", label: "Last 7 days", description: "Most recent week", performance: "excellent" },
  { value: "14-days", label: "Last 14 days", description: "Past 2 weeks", performance: "excellent" },
  { value: "30-days", label: "Last 30 days", description: "Past month", performance: "good" },
  { value: "60-days", label: "Last 60 days", description: "Past 2 months", performance: "good" },
  { value: "90-days", label: "Last 90 days", description: "Past 3 months", performance: "fair" },
  { value: "180-days", label: "Last 180 days", description: "Past 6 months", performance: "fair" },
  { value: "all", label: "All data", description: "Complete history", performance: "slow" },
]

export function SyncStrategyStep({ configuration, updateConfiguration }: SyncStrategyStepProps) {
  const handleSyncStrategyChange = (strategy: "date-based" | "row-based") => {
    updateConfiguration({
      syncStrategy: strategy,
      // Reset sync range to default when strategy changes
      syncRange: strategy === "date-based" ? "60-days" : "row-1500",
    })
  }

  const handleRowBasedChange = (value: string) => {
    const rowNumber = Number.parseInt(value)
    if (!isNaN(rowNumber) && rowNumber > 0) {
      updateConfiguration({ syncRange: `row-${rowNumber}` })
    }
  }

  const getRowNumber = () => {
    if (configuration.syncStrategy === "row-based" && configuration.syncRange.startsWith("row-")) {
      return configuration.syncRange.replace("row-", "")
    }
    return "1500"
  }

  const getPerformanceInfo = () => {
    if (configuration.syncStrategy === "date-based") {
      const option = DATE_BASED_OPTIONS.find((opt) => opt.value === configuration.syncRange)
      return option?.performance || "good"
    } else {
      const rowNumber = Number.parseInt(getRowNumber())
      if (rowNumber < 1000) return "excellent"
      if (rowNumber < 5000) return "good"
      if (rowNumber < 10000) return "fair"
      return "slow"
    }
  }

  const getPerformanceBadge = (performance: string) => {
    const configs = {
      excellent: { color: "bg-green-100 text-green-800 border-green-200", icon: Zap },
      good: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCircle },
      fair: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
      slow: { color: "bg-red-100 text-red-800 border-red-200", icon: AlertTriangle },
    }

    const config = configs[performance as keyof typeof configs] || configs.good
    const Icon = config.icon

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {performance.charAt(0).toUpperCase() + performance.slice(1)}
      </Badge>
    )
  }

  const estimateRowCount = () => {
    if (!configuration.sheetMetadata) return "Unknown"

    const totalRows =
      configuration.sheetMetadata.sheets.find((sheet) => sheet.properties.title === configuration.selectedTab)
        ?.properties.gridProperties.rowCount || 0

    if (configuration.syncStrategy === "date-based") {
      // Rough estimation based on date range
      const multipliers = {
        "7-days": 0.02,
        "14-days": 0.04,
        "30-days": 0.08,
        "60-days": 0.15,
        "90-days": 0.25,
        "180-days": 0.5,
        all: 1,
      }
      const multiplier = multipliers[configuration.syncRange as keyof typeof multipliers] || 0.15
      return Math.round(totalRows * multiplier).toLocaleString()
    } else {
      const startRow = Number.parseInt(getRowNumber())
      const estimatedRows = Math.max(0, totalRows - startRow + 1)
      return estimatedRows.toLocaleString()
    }
  }

  const currentPerformance = getPerformanceInfo()

  return (
    <div className="space-y-6">
      {/* Sync Strategy Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-sm font-medium mr-3">
              3
            </div>
            Sync Strategy
          </CardTitle>
          <CardDescription>Choose how to synchronize data from your Google Sheet</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={configuration.syncStrategy} onValueChange={handleSyncStrategyChange} className="space-y-4">
            {/* Date-based Strategy */}
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="date-based" id="date-based" className="mt-1" />
              <Label htmlFor="date-based" className="flex-1 cursor-pointer">
                <div className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Date-based Sync</span>
                    <Badge className="bg-green-100 text-green-800 border-green-200">Recommended</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Sync orders from a specific time period. Best for ongoing operations and performance.
                  </p>

                  {configuration.syncStrategy === "date-based" && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Time Range</Label>
                      <Select
                        value={configuration.syncRange}
                        onValueChange={(value) => updateConfiguration({ syncRange: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DATE_BASED_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center justify-between w-full">
                                <div>
                                  <div className="font-medium">{option.label}</div>
                                  <div className="text-xs text-gray-500">{option.description}</div>
                                </div>
                                <div className="ml-4">{getPerformanceBadge(option.performance)}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </Label>
            </div>

            {/* Row-based Strategy */}
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="row-based" id="row-based" className="mt-1" />
              <Label htmlFor="row-based" className="flex-1 cursor-pointer">
                <div className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    <span className="font-medium">Row-based Sync</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Sync from a specific row number. Useful for large sheets or when you know the starting point.
                  </p>

                  {configuration.syncStrategy === "row-based" && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Start from Row</Label>
                      <Input
                        type="number"
                        min="1"
                        value={getRowNumber()}
                        onChange={(e) => handleRowBasedChange(e.target.value)}
                        placeholder="1500"
                        className="w-32"
                      />
                      <p className="text-xs text-gray-500">Data will be synced from this row number onwards</p>
                    </div>
                  )}
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Performance Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Preview</CardTitle>
          <CardDescription>Estimated impact of your sync strategy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{estimateRowCount()}</div>
              <div className="text-sm text-gray-600">Estimated Rows</div>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-center mb-2">{getPerformanceBadge(currentPerformance)}</div>
              <div className="text-sm text-gray-600">Performance</div>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {configuration.syncStrategy === "date-based" ? "Auto" : "Manual"}
              </div>
              <div className="text-sm text-gray-600">Update Frequency</div>
            </div>
          </div>

          {/* Performance Recommendations */}
          {currentPerformance === "slow" && (
            <Alert className="mt-4 border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">
                <div className="font-medium mb-1">Performance Warning</div>
                <div className="text-sm">
                  This configuration may result in slower loading times. Consider using a more recent date range or
                  higher row number for better performance.
                </div>
              </AlertDescription>
            </Alert>
          )}

          {currentPerformance === "excellent" && (
            <Alert className="mt-4 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                <div className="font-medium mb-1">Optimal Configuration</div>
                <div className="text-sm">
                  This sync strategy provides excellent performance and is recommended for most use cases.
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Validation Summary */}
      <Card className="border-gray-200">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Step 3 Requirements</h4>
            <div className="space-y-1">
              <div className="flex items-center text-sm">
                {configuration.syncStrategy ? (
                  <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center mr-2">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 mr-2" />
                )}
                Sync strategy selected
              </div>
              <div className="flex items-center text-sm">
                {configuration.syncRange ? (
                  <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center mr-2">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 mr-2" />
                )}
                Sync range configured
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
