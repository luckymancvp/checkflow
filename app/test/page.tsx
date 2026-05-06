"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useApi } from "@/hooks/use-api"
import { useApiMutation } from "@/hooks/use-api"
import { Loader2, RefreshCw, User, Calendar, FileText, AlertCircle, CheckCircle, XCircle } from "lucide-react"

const ITEM_ID = "568457"
const GOOGLE_SHEET_ID = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"

export default function TestPage() {
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>("")
  const [reviewAccuracy, setReviewAccuracy] = useState<string>("")

  // API hooks
  const {
    data: orderHistory,
    loading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useApi(`/orders/${ITEM_ID}/history`)

  const { mutate: updateReviewAccuracy, loading: accuracyLoading } = useApiMutation(
    selectedHistoryId ? `/orders/history/${selectedHistoryId}/review-accuracy` : "",
    {
      method: "PUT",
      onSuccess: () => {
        refetchHistory()
        setSelectedHistoryId("")
        setReviewAccuracy("")
      },
    },
  )

  const handleUpdateAccuracy = () => {
    if (!selectedHistoryId || !reviewAccuracy) return

    updateReviewAccuracy({
      reviewAccuracy: reviewAccuracy === "clear" ? null : reviewAccuracy,
    })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      NEW: "outline",
      DESIGNED: "default",
      CONFIRMED: "secondary",
      "NEED REPAIR": "destructive",
      REPAIRED: "secondary",
    }
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>
  }

  const getChangeTypeBadge = (changeType: string | null) => {
    if (!changeType) return null
    const color = changeType === "design_error" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"
    return <Badge className={color}>{changeType.replace("_", " ").toUpperCase()}</Badge>
  }

  const getAccuracyIcon = (accuracy: string | null) => {
    if (accuracy === "correct") return <CheckCircle className="h-4 w-4 text-green-600" />
    if (accuracy === "incorrect") return <XCircle className="h-4 w-4 text-red-600" />
    return <AlertCircle className="h-4 w-4 text-gray-400" />
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order Management API Test</h1>
          <p className="text-muted-foreground">Testing with Item ID: {ITEM_ID}</p>
        </div>
        <Button variant="outline" onClick={refetchHistory} disabled={historyLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${historyLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Order History */}
      <Card>
        <CardHeader>
          <CardTitle>2. Order History (GET /api/orders/{ITEM_ID}/history)</CardTitle>
          <CardDescription>Complete order information and history records</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading order history...
            </div>
          )}

          {historyError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">API Error</h4>
              <pre className="text-sm text-red-700 whitespace-pre-wrap">{JSON.stringify(historyError, null, 2)}</pre>
            </div>
          )}

          {orderHistory && (
            <div className="space-y-4">
              {/* Order Info */}
              {orderHistory.data.order ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">Order Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <div>
                      <strong>Order ID:</strong> {orderHistory.data.order.id}
                    </div>
                    <div>
                      <strong>Item ID:</strong> {orderHistory.data.order.itemId}
                    </div>
                    <div>
                      <strong>Sheet:</strong> {orderHistory.data.order.sheetName}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-600">No order found with Item ID {ITEM_ID}</p>
                </div>
              )}

              {/* History Records */}
              {orderHistory.data.history.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-medium">History Records ({orderHistory.data.history.length})</h4>
                  {orderHistory.data.history.map((record: any, index: number) => (
                    <div key={record.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">#{index + 1}</span>
                          {getStatusBadge(record.status)}
                          {getChangeTypeBadge(record.changeType)}
                          <div className="flex items-center gap-1">
                            {getAccuracyIcon(record.reviewAccuracy)}
                            <span className="text-xs text-gray-500">{record.reviewAccuracy || "Not reviewed"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {new Date(record.createdAt).toLocaleString()}
                        </div>
                      </div>

                      {record.orderNote && (
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                          <p className="text-sm text-gray-700">{record.orderNote}</p>
                        </div>
                      )}

                      {record.createdBy && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <User className="h-3 w-3" />
                          {record.createdBy.name} ({record.createdBy.email})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No history records found</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Review Accuracy */}
      {orderHistory?.data?.history?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>3. Update Review Accuracy (PUT /api/orders/history/:historyId/review-accuracy)</CardTitle>
            <CardDescription>Mark the accuracy of supporter review decisions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select History Record</label>
                <Select value={selectedHistoryId} onValueChange={setSelectedHistoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select history record" />
                  </SelectTrigger>
                  <SelectContent>
                    {orderHistory.data.history.map((record: any, index: number) => (
                      <SelectItem key={record.id} value={record.id}>
                        #{index + 1} - {record.status} ({new Date(record.createdAt).toLocaleDateString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Review Accuracy</label>
                <Select value={reviewAccuracy} onValueChange={setReviewAccuracy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select accuracy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="correct">Correct</SelectItem>
                    <SelectItem value="incorrect">Incorrect</SelectItem>
                    <SelectItem value="clear">Clear (set to null)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleUpdateAccuracy} disabled={!selectedHistoryId || !reviewAccuracy || accuracyLoading}>
              {accuracyLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Review Accuracy
            </Button>
          </CardContent>
        </Card>
      )}

      {/* API Response Debug */}
      <Card>
        <CardHeader>
          <CardTitle>API Response Debug</CardTitle>
          <CardDescription>Raw API responses for debugging</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orderHistory && (
              <div>
                <h4 className="font-medium mb-2">Order History Response:</h4>
                <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-64">
                  {JSON.stringify(orderHistory, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
