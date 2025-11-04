"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, AlertTriangle, RefreshCw, Eye, EyeOff } from "lucide-react"
import type { SheetConfiguration } from "../add-sheet-modal"
import { googleSheetsClient } from "@/lib/google-sheets-client"

interface ColumnMappingStepProps {
  configuration: SheetConfiguration
  updateConfiguration: (updates: Partial<SheetConfiguration>) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

const FIELD_MAPPINGS = [
  { key: "itemId", label: "Item ID", description: "Unique order identifier", required: true },
  { key: "status", label: "Status", description: "Order status", required: true },
  { key: "designer", label: "Designer", description: "Designer name", required: true },
  { key: "orderNote", label: "Order Note", description: "Customer requirements", required: false },
  { key: "design", label: "Design", description: "Design file link", required: false },
  { key: "mockup", label: "Mockup", description: "Mockup image link", required: false },
  { key: "customerImage", label: "Customer Image", description: "Reference image", required: false },
  { key: "personalization", label: "Personalization", description: "Custom text/details", required: false },
  { key: "date", label: "Date", description: "Order date", required: false },
  { key: "store", label: "Store", description: "Store name", required: false },
  { key: "image", label: "Product Image", description: "Product image", required: false },
  { key: "productType", label: "Product Type", description: "Type of product", required: false },
  { key: "productName", label: "Product Name", description: "Product name", required: false },
]

const AUTO_MAPPING_PATTERNS = {
  itemId: ["item id"],
  status: ["status"],
  orderNote: ["order note"],
  designer: ["designer"],
  design: ["design"],
  mockup: ["mockup"],
  customerImage: ["customer image"],
  personalization: ["personalization"],
  date: ["date"],
  store: ["store"],
  image: ["image"],
  productType: ["product type"],
  productName: ["product name"],
}

export function ColumnMappingStep({
  configuration,
  updateConfiguration,
  isLoading,
  setIsLoading,
}: ColumnMappingStepProps) {
  const [loadingHeaders, setLoadingHeaders] = useState(false)
  const [headersError, setHeadersError] = useState<string | null>(null)
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([])
  const [sampleData, setSampleData] = useState<Record<string, string>[]>([])
  const [showSampleData, setShowSampleData] = useState(false)

  const loadHeadersAndSampleData = async () => {
    if (!configuration.googleSheetId || !configuration.selectedTab) {
      return
    }

    setLoadingHeaders(true)
    setHeadersError(null)

    try {
      // Load headers from the specified header row
      const headerRange = `${configuration.selectedTab}!${configuration.headerRow}:${configuration.headerRow}`
      const headerResponse = await googleSheetsClient.getSheetData(configuration.googleSheetId, headerRange)

      if (!headerResponse.success) {
        throw new Error(`Failed to load headers: ${headerResponse.error}`)
      }

      const headers = headerResponse.data?.values?.[0] || []
      setDetectedHeaders(headers)
      updateConfiguration({ detectedHeaders: headers })

      // Load sample data (first few rows after header)
      const sampleStartRow = configuration.startRow
      const sampleEndRow = Math.min(sampleStartRow + 2, sampleStartRow + 5) // Load 3-5 sample rows
      const sampleRange = `${configuration.selectedTab}!${sampleStartRow}:${sampleEndRow}`

      const sampleResponse = await googleSheetsClient.getSheetData(configuration.googleSheetId, sampleRange)

      if (sampleResponse.success) {
        const rows = sampleResponse.data?.values || []
        const sampleRows = rows.map((row: string[]) => {
          const rowData: Record<string, string> = {}
          headers.forEach((header: string, index: number) => {
            rowData[header] = row[index] || ""
          })
          return rowData
        })
        setSampleData(sampleRows)
        updateConfiguration({ sampleData: sampleRows })
      }

      // Auto-map fields based on header names
      autoMapFields(headers)
    } catch (error) {
      setHeadersError(error instanceof Error ? error.message : "Failed to load headers")
      setDetectedHeaders([])
      setSampleData([])
      updateConfiguration({ detectedHeaders: [], sampleData: [] })
    } finally {
      setLoadingHeaders(false)
    }
  }

  const autoMapFields = (headers: string[]) => {
    if (configuration.isEditing) {
      return
    }

    const newMapping = { ...configuration.columnMapping }

    Object.entries(AUTO_MAPPING_PATTERNS).forEach(([fieldKey, patterns]) => {
      const matchedHeader = headers.find((header) =>
        patterns.some(
          (pattern) =>
            header.toLowerCase().includes(pattern.toLowerCase()) ||
            pattern.toLowerCase().includes(header.toLowerCase()),
        ),
      )

      if (matchedHeader) {
        newMapping[fieldKey as keyof typeof newMapping] = matchedHeader
      }
    })

    updateConfiguration({ columnMapping: newMapping })
  }

  const handleFieldMapping = (fieldKey: string, headerValue: string) => {
    updateConfiguration({
      columnMapping: {
        ...configuration.columnMapping,
        [fieldKey]: headerValue,
      },
    })
  }

  const getRequiredFieldsStatus = () => {
    const requiredFields = FIELD_MAPPINGS.filter((field) => field.required)
    const mappedRequired = requiredFields.filter(
      (field) => configuration.columnMapping[field.key as keyof typeof configuration.columnMapping],
    )
    return {
      total: requiredFields.length,
      mapped: mappedRequired.length,
      complete: mappedRequired.length === requiredFields.length,
    }
  }

  const getMappedFieldsCount = () => {
    return Object.values(configuration.columnMapping).filter((value) => value.trim()).length
  }

  // Load headers when component mounts or dependencies change
  useEffect(() => {
    if (configuration.googleSheetId && configuration.selectedTab) {
      loadHeadersAndSampleData()
    }
  }, [configuration.googleSheetId, configuration.selectedTab])

  const requiredStatus = getRequiredFieldsStatus()
  const mappedCount = getMappedFieldsCount()

  return (
    <div className="space-y-6">
      {/* Header Loading */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-sm font-medium mr-3">
              5
            </div>
            Column Mapping
          </CardTitle>
          <CardDescription>Map your sheet columns to CheckFlow fields</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Loading State */}
          {loadingHeaders && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-pink-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading sheet headers...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {headersError && (
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                <div className="font-medium mb-1">Failed to Load Headers</div>
                <div className="text-sm mb-2">{headersError}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadHeadersAndSampleData}
                  className="bg-white hover:bg-gray-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Headers Detected */}
          {detectedHeaders.length > 0 && !loadingHeaders && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Headers Detected</div>
                  <div className="text-sm text-gray-600">
                    {detectedHeaders.length} columns found in row {configuration.headerRow}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setShowSampleData(!showSampleData)}>
                    {showSampleData ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    {showSampleData ? "Hide" : "Show"} Sample Data
                  </Button>
                  <Button variant="outline" size="sm" onClick={loadHeadersAndSampleData} disabled={loadingHeaders}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Sample Data Preview */}
              {showSampleData && sampleData.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <div className="font-medium text-sm">Sample Data Preview</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          {detectedHeaders.map((header, index) => (
                            <th key={index} className="px-3 py-2 text-left font-medium text-gray-700 border-r">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sampleData.slice(0, 3).map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-b">
                            {detectedHeaders.map((header, colIndex) => (
                              <td key={colIndex} className="px-3 py-2 border-r text-gray-600">
                                <div className="truncate max-w-32" title={row[header]}>
                                  {row[header] || "-"}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field Mapping */}
      {detectedHeaders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Field Mapping</CardTitle>
            <CardDescription>Map each CheckFlow field to the corresponding column in your sheet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FIELD_MAPPINGS.map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={field.key} className="font-medium">
                      {field.label}
                    </Label>
                    {field.required && (
                      <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200 text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                  <Select
                    value={
                      configuration.columnMapping[field.key as keyof typeof configuration.columnMapping] || "default"
                    }
                    onValueChange={(value) => handleFieldMapping(field.key, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">
                        <span className="text-gray-500">Not mapped</span>
                      </SelectItem>
                      {detectedHeaders.map((header, index) => (
                        <SelectItem key={index} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">{field.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mapping Summary */}
      {detectedHeaders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mapping Summary</CardTitle>
            <CardDescription>Overview of your field mappings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{mappedCount}</div>
                <div className="text-sm text-gray-600">Fields Mapped</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {requiredStatus.mapped}/{requiredStatus.total}
                </div>
                <div className="text-sm text-gray-600">Required Fields</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-center mb-2">
                  {requiredStatus.complete ? (
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Incomplete
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600">Status</div>
              </div>
            </div>

            {!requiredStatus.complete && (
              <Alert className="mt-4 border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700">
                  <div className="font-medium mb-1">Required Fields Missing</div>
                  <div className="text-sm">Please map all required fields (Item ID, Status, Designer) to continue.</div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Validation Summary */}
      <Card className="border-gray-200">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Step 5 Requirements</h4>
            <div className="space-y-1">
              <div className="flex items-center text-sm">
                {detectedHeaders.length > 0 ? (
                  <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center mr-2">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 mr-2" />
                )}
                Sheet headers loaded
              </div>
              <div className="flex items-center text-sm">
                {requiredStatus.complete ? (
                  <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center mr-2">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 mr-2" />
                )}
                Required fields mapped ({requiredStatus.mapped}/{requiredStatus.total})
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
