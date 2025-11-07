"use client"

import { useRouter } from "next/navigation"
import { useOrderData } from "@/hooks/use-order-data"
import { SheetSelector } from "@/components/review/sheet-selector"
import { OrderListHeader } from "@/components/review/order-list-header"
import { SyncStatusIndicator } from "@/components/sync-status-indicator"
import type { Order } from "@/types/order"
import { useState, useEffect, useMemo } from "react"
import { OrderReviewModal } from "@/components/review/order-review-modal"
import { googleSheetsClient } from "@/lib/google-sheets-client"
import { RefreshCw } from "lucide-react"

export default function ReviewPage() {
  const router = useRouter()
  const {
    orders,
    allOrders, // Added allOrders to get all orders regardless of pagination
    sheets,
    selectedSheet,
    loading,
    error,
    totalCount,
    filteredCount,
    filters,
    filterOptions,
    lastSync,
    loadingTime,
    pagination,
    syncStatus,
    syncError,
    pendingChanges,
    triggerManualSync,
    loadOrdersFromSheet,
    applyFilters,
    refreshData,
    changePageSize,
    changePage,
    updateOrderStatus,
    reloadOrderFromSheet, // Import the new reload function
  } = useOrderData()

  const [reviewMode, setReviewMode] = useState<{
    isActive: boolean
    currentIndex: number
    orders: Order[]
  } | null>(null)

  const [isLoadingNewSheet, setIsLoadingNewSheet] = useState(false)
  const [isJumpLoading, setIsJumpLoading] = useState(false) // Added loading state for jumping to orders

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    allOrders.forEach((order) => {
      if (order.status) {
        counts[order.status] = (counts[order.status] || 0) + 1
      }
    })
    return counts
  }, [allOrders])

  const filteredCounts = useMemo(() => {
    const designerCounts: Record<string, number> = {}
    const productTypeCounts: Record<string, number> = {}
    const storeCounts: Record<string, number> = {}

    // For designer counts: apply all filters EXCEPT designer filter
    const ordersForDesignerCount = allOrders.filter((order) => {
      if (filters.status && filters.status.length > 0 && !filters.status.includes(order.status)) {
        return false
      }
      // Skip designer filter when calculating designer counts
      if (filters.productType && filters.productType.length > 0 && !filters.productType.includes(order.productType)) {
        return false
      }
      if (filters.store && filters.store.length > 0 && !filters.store.includes(order.store)) {
        return false
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        const searchableText = [
          order.itemId,
          order.orderNote,
          order.personalization,
          order.productName,
          order.designer,
          order.store,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        if (!searchableText.includes(query)) {
          return false
        }
      }
      return true
    })

    // For productType counts: apply all filters EXCEPT productType filter
    const ordersForProductTypeCount = allOrders.filter((order) => {
      if (filters.status && filters.status.length > 0 && !filters.status.includes(order.status)) {
        return false
      }
      if (filters.designer && filters.designer.length > 0 && !filters.designer.includes(order.designer)) {
        return false
      }
      // Skip productType filter when calculating productType counts
      if (filters.store && filters.store.length > 0 && !filters.store.includes(order.store)) {
        return false
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        const searchableText = [
          order.itemId,
          order.orderNote,
          order.personalization,
          order.productName,
          order.designer,
          order.store,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        if (!searchableText.includes(query)) {
          return false
        }
      }
      return true
    })

    // For store counts: apply all filters EXCEPT store filter
    const ordersForStoreCount = allOrders.filter((order) => {
      if (filters.status && filters.status.length > 0 && !filters.status.includes(order.status)) {
        return false
      }
      if (filters.designer && filters.designer.length > 0 && !filters.designer.includes(order.designer)) {
        return false
      }
      if (filters.productType && filters.productType.length > 0 && !filters.productType.includes(order.productType)) {
        return false
      }
      // Skip store filter when calculating store counts
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        const searchableText = [
          order.itemId,
          order.orderNote,
          order.personalization,
          order.productName,
          order.designer,
          order.store,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        if (!searchableText.includes(query)) {
          return false
        }
      }
      return true
    })

    // Count designers from filtered orders (excluding designer filter)
    ordersForDesignerCount.forEach((order) => {
      if (order.designer) {
        designerCounts[order.designer] = (designerCounts[order.designer] || 0) + 1
      }
    })

    // Count product types from filtered orders (excluding productType filter)
    ordersForProductTypeCount.forEach((order) => {
      if (order.productType) {
        productTypeCounts[order.productType] = (productTypeCounts[order.productType] || 0) + 1
      }
    })

    // Count stores from filtered orders (excluding store filter)
    ordersForStoreCount.forEach((order) => {
      if (order.store) {
        storeCounts[order.store] = (storeCounts[order.store] || 0) + 1
      }
    })

    return { designerCounts, productTypeCounts, storeCounts }
  }, [allOrders, filters])

  useEffect(() => {
    const refreshTokensOnLoad = async () => {
      try {
        console.log("[ReviewPage] Refreshing tokens on page load...")
        await googleSheetsClient.getValidAccessToken()
        console.log("[ReviewPage] Token refresh completed successfully")
      } catch (error) {
        console.error("[ReviewPage] Token refresh failed on page load:", error)
      }
    }

    refreshTokensOnLoad()
  }, [])

  const handleSheetSelect = async (sheet: any) => {
    console.log("[ReviewPage] Sheet selected:", sheet.name)
    setIsLoadingNewSheet(true)

    try {
      await loadOrdersFromSheet(sheet)
    } finally {
      setIsLoadingNewSheet(false)
    }
  }

  const handleStartSequentialReview = () => {
    if (orders.length === 0) return

    console.log("[ReviewPage] Starting sequential review with", orders.length, "orders")
    setReviewMode({
      isActive: true,
      currentIndex: 0,
      orders: orders,
    })
  }

  const handleReviewClose = () => {
    setReviewMode(null)
  }

  const handleReviewNext = () => {
    if (!reviewMode || reviewMode.currentIndex >= reviewMode.orders.length - 1) return
    setReviewMode({
      ...reviewMode,
      currentIndex: reviewMode.currentIndex + 1,
    })
  }

  const handleReviewPrevious = () => {
    if (!reviewMode || reviewMode.currentIndex <= 0) return
    setReviewMode({
      ...reviewMode,
      currentIndex: reviewMode.currentIndex - 1,
    })
  }

  const handleJumpToIndex = async (index: number) => {
    if (!reviewMode || index < 0 || index >= reviewMode.orders.length) return

    const targetOrder = reviewMode.orders[index]
    console.log(`[v0] Jumping to order ${targetOrder.itemId}, reloading data from sheet`)

    setIsJumpLoading(true) // Set loading state before reloading

    try {
      const reloadedOrder = await reloadOrderFromSheet(targetOrder.itemId)

      if (reloadedOrder) {
        setReviewMode((prev) => {
          if (!prev) return prev

          const updatedOrders = prev.orders.map((o) => (o.itemId === targetOrder.itemId ? reloadedOrder : o))

          return {
            ...prev,
            orders: updatedOrders,
            currentIndex: index,
          }
        })
      } else {
        setReviewMode({
          ...reviewMode,
          currentIndex: index,
        })
      }
    } finally {
      setIsJumpLoading(false) // Clear loading state after reload completes
    }
  }

  const handleReviewAction = async (
    action: "confirm" | "need_repair" | "skip",
    repairType?: "design_error" | "customer_change",
    note?: string,
  ) => {
    if (!reviewMode) return

    const currentOrder = reviewMode.orders[reviewMode.currentIndex]
    console.log("[ReviewPage] Review action:", action, "for order:", currentOrder.itemId)

    if (action === "confirm") {
      console.log("[ReviewPage] Confirming order, updating status to CONFIRMED")
      const success = await updateOrderStatus(currentOrder, "CONFIRMED", note)

      if (!success) {
        console.error("[ReviewPage] Failed to update order status to CONFIRMED")
        return
      }

      console.log("[ReviewPage] Successfully confirmed order:", currentOrder.itemId)
    } else if (action === "need_repair") {
      console.log("[ReviewPage] Marking order as needing repair with type:", repairType)

      if (!repairType) {
        console.error("[ReviewPage] Change type is required for NEED_REPAIR action")
        return
      }

      const success = await updateOrderStatus(currentOrder, "NEED_REPAIR", note, repairType)

      if (!success) {
        console.error("[ReviewPage] Failed to update order status to NEED_REPAIR")
        return
      }

      console.log("[ReviewPage] Successfully marked order as needing repair:", currentOrder.itemId)
    }

    if (reviewMode.currentIndex < reviewMode.orders.length - 1) {
      handleReviewNext()
    } else {
      setReviewMode(null)
    }
  }

  const handleStatusUpdate = async (
    newStatus: Order["status"],
    note?: string,
    changeType?: "design_error" | "customer_change",
  ) => {
    if (!reviewMode) return

    const currentOrder = reviewMode.orders[reviewMode.currentIndex]
    console.log("[ReviewPage] Status dropdown update:", newStatus, "for order:", currentOrder.itemId)

    const success = await updateOrderStatus(currentOrder, newStatus, note, changeType)
    if (!success) {
      console.error("[ReviewPage] Failed to update order status via dropdown")
    } else {
      console.log("[ReviewPage] Successfully updated order status via dropdown:", currentOrder.itemId)

      setReviewMode((prev) => {
        if (!prev) return prev

        const updatedOrders = prev.orders.map((order) =>
          order.itemId === currentOrder.itemId
            ? { ...order, status: newStatus, orderNote: note !== undefined ? note : order.orderNote }
            : order,
        )

        return {
          ...prev,
          orders: updatedOrders,
        }
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order Review</h1>
              <p className="text-gray-600 mt-2">Select a Google Sheet and review orders for quality assurance</p>
            </div>
            <div className="flex items-center gap-4">
              <SyncStatusIndicator
                status={syncStatus}
                pendingChanges={pendingChanges}
                error={syncError}
                onManualSync={triggerManualSync}
              />
            </div>
          </div>
        </div>

        <SheetSelector
          sheets={sheets}
          selectedSheet={selectedSheet}
          loading={loading}
          onSheetSelect={handleSheetSelect}
          onRefresh={refreshData}
          lastSync={lastSync}
          syncStatus={syncStatus}
          pendingChanges={pendingChanges}
          syncError={syncError}
          onManualSync={triggerManualSync}
        />

        {selectedSheet && !isLoadingNewSheet && (
          <OrderListHeader
            totalCount={totalCount}
            filteredCount={filteredCount}
            filters={filters}
            onFiltersChange={applyFilters}
            onStartSequentialReview={handleStartSequentialReview}
            loadingTime={loadingTime}
            pagination={pagination}
            onPageSizeChange={changePageSize}
            onPageChange={changePage}
            filterOptions={filterOptions}
            statusCounts={statusCounts}
            designerCounts={filteredCounts.designerCounts}
            productTypeCounts={filteredCounts.productTypeCounts}
            storeCounts={filteredCounts.storeCounts}
            syncStatus={syncStatus}
            pendingChanges={pendingChanges}
            syncError={syncError}
            onManualSync={triggerManualSync}
            lastSync={lastSync}
            onRefresh={refreshData}
          />
        )}

        {selectedSheet && isLoadingNewSheet && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin mr-3 text-blue-600" />
              <span className="text-lg text-gray-600">Loading orders from selected sheet...</span>
            </div>
          </div>
        )}

        {reviewMode && (
          <OrderReviewModal
            isOpen={reviewMode.isActive}
            order={reviewMode.orders[reviewMode.currentIndex]}
            currentIndex={reviewMode.currentIndex}
            totalCount={reviewMode.orders.length}
            selectedSheet={sheets.find((s) => s.id === selectedSheet)}
            onClose={handleReviewClose}
            onNext={handleReviewNext}
            onPrevious={handleReviewPrevious}
            onJumpToIndex={handleJumpToIndex}
            onAction={handleReviewAction}
            availableStatuses={filterOptions.statuses}
            onStatusUpdate={handleStatusUpdate}
            syncStatus={syncStatus}
            pendingChanges={pendingChanges}
            syncError={syncError}
            onManualSync={triggerManualSync}
            reviewMode={reviewMode}
            isJumpLoading={isJumpLoading} // Pass loading state to modal
          />
        )}
      </div>
    </div>
  )
}
