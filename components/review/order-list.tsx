"use client"

import { RefreshCw, AlertCircle, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { OrderListItem } from "./order-list-item"
import type { Order } from "@/types/order"

interface OrderListProps {
  orders: Order[]
  loading: boolean
  error: string | null
  onRetry?: () => void
}

export function OrderList({ orders, loading, error, onRetry }: OrderListProps) {
  if (loading) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <div className="p-12">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <RefreshCw className="h-12 w-12 animate-spin text-blue-600" />
              <div className="absolute inset-0 h-12 w-12 border-4 border-blue-100 rounded-full"></div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">Loading Orders</h3>
              <p className="text-gray-600">Fetching data from Google Sheets...</p>
              <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 shadow-sm">
        <div className="p-12">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <AlertCircle className="h-12 w-12 text-red-600" />
              <div className="absolute inset-0 h-12 w-12 border-4 border-red-100 rounded-full"></div>
            </div>
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">Error Loading Orders</h3>
              <div className="max-w-md">
                <p className="text-gray-600 leading-relaxed">{error}</p>
              </div>
              {onRetry && (
                <Button
                  onClick={onRetry}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50 bg-transparent"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (orders.length === 0) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <div className="p-12">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <Search className="h-12 w-12 text-gray-400" />
              <div className="absolute inset-0 h-12 w-12 border-4 border-gray-100 rounded-full"></div>
            </div>
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">No Orders Found</h3>
              <div className="max-w-md space-y-2">
                <p className="text-gray-600 leading-relaxed">
                  No orders match your current search criteria or filters.
                </p>
                <p className="text-sm text-gray-500">
                  Try adjusting your search terms, clearing filters, or selecting a different sheet.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderListItem key={`${order.sheetId}-${order.itemId}`} order={order} />
      ))}
    </div>
  )
}
