"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useApi } from "@/hooks/use-api"
import { useApiMutation } from "@/hooks/use-api"
import { googleSheetsClient } from "@/lib/google-sheets-client"
import type { Order, OrderFilters, OrderListState } from "@/types/order"
import type { Sheet } from "@/types/sheet"

interface SheetListResponse {
  success: boolean
  data: Sheet[]
  error?: string
}

interface SyncQueueItem {
  id: string
  order: Order
  newStatus: Order["status"]
  note?: string
  changeType?: "design_error" | "customer_change"
  timestamp: number
}

type SyncStatus = "idle" | "syncing" | "success" | "error"

interface CachedSheetHeaders {
  [sheetId: string]: {
    headers: string[]
    timestamp: number
    columnMapping: any
  }
}

const FILTER_STORAGE_KEY = "checkflow_order_filters"

export function useOrderData() {
  const loadFiltersFromStorage = useCallback((): OrderFilters => {
    try {
      const stored = localStorage.getItem(FILTER_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Validate that the parsed object has the expected structure
        if (parsed && typeof parsed === "object") {
          return parsed as OrderFilters
        }
      }
    } catch (error) {
      console.error("Failed to load filters from localStorage:", error)
    }
    // Default filters when localStorage is empty or invalid
    return { status: ["DESIGNED", "REPAIRED"] }
  }, [])

  const saveFiltersToStorage = useCallback((filters: OrderFilters) => {
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters))
    } catch (error) {
      console.error("Failed to save filters to localStorage:", error)
    }
  }, [])

  const [state, setState] = useState<OrderListState>({
    orders: [],
    filteredOrders: [],
    filters: {}, // Will be loaded from localStorage in useEffect
    selectedSheet: null,
    loading: false,
    error: null,
    totalCount: 0,
  })

  // Add pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50, // Changed default from 10 to 50
    totalPages: 0,
  })

  // Add loading time tracking
  const [loadingTime, setLoadingTime] = useState<number | null>(null)
  const [hasAutoFiltered, setHasAutoFiltered] = useState(false)

  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([])
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle")
  const [syncError, setSyncError] = useState<string | null>(null)
  const isSyncingRef = useRef(false)
  const syncQueueRef = useRef<SyncQueueItem[]>([])

  const cachedHeadersRef = useRef<CachedSheetHeaders>({})

  // Load available sheets
  const { data: sheetsResponse, loading: sheetsLoading, error: sheetsError } = useApi<SheetListResponse>("/sheets")
  const sheets = sheetsResponse?.data || []

  const { mutate: callOrderAPI, loading: apiLoading } = useApiMutation()

  const syncOrderToGoogleSheets = useCallback(
    async (order: Order, newStatus: Order["status"], note?: string) => {
      if (!order.rowPosition) {
        throw new Error(`Cannot update order ${order.itemId} - no row position stored`)
      }

      const sheet = sheets.find((s) => s.id === order.sheetId)
      if (!sheet) {
        throw new Error(`Sheet not found for order ${order.itemId}`)
      }

      const { columnMapping } = sheet.configuration
      const statusColumnHeader = columnMapping.status
      const orderNoteColumnHeader = columnMapping.orderNote

      if (!statusColumnHeader) {
        throw new Error(`No status column mapping found for order ${order.itemId}`)
      }

      const cachedData = cachedHeadersRef.current[sheet.id]
      if (!cachedData) {
        throw new Error(`No cached headers found for sheet ${sheet.id}. Please refresh the sheet data.`)
      }

      const headers = cachedData.headers
      const statusColumnIndex = headers.findIndex((header: string) => header === statusColumnHeader)
      const orderNoteColumnIndex = orderNoteColumnHeader
        ? headers.findIndex((header: string) => header === orderNoteColumnHeader)
        : -1

      if (statusColumnIndex === -1) {
        throw new Error(`Status column not found in headers for order ${order.itemId}`)
      }

      const updates: Array<{ range: string; values: string[][] }> = []

      // Update status
      const statusColumnLetter = String.fromCharCode(65 + statusColumnIndex)
      const statusCellRange = `${sheet.tab_name}!${statusColumnLetter}${order.rowPosition}`
      const sheetStatus = newStatus === "NEED_REPAIR" ? "NEED REPAIR" : newStatus

      updates.push({
        range: statusCellRange,
        values: [[sheetStatus]],
      })

      // Update note if provided
      if (note !== undefined && note !== order.orderNote && orderNoteColumnIndex !== -1) {
        const orderNoteColumnLetter = String.fromCharCode(65 + orderNoteColumnIndex)
        const orderNoteCellRange = `${sheet.tab_name}!${orderNoteColumnLetter}${order.rowPosition}`

        updates.push({
          range: orderNoteCellRange,
          values: [[note]],
        })
      }

      // Execute all updates
      for (const update of updates) {
        const updateResponse = await googleSheetsClient.updateSheetData(
          sheet.google_sheet_id,
          update.range,
          update.values,
        )

        if (!updateResponse.success) {
          throw new Error(`Failed to update ${update.range}: ${updateResponse.error}`)
        }
      }
    },
    [sheets],
  )

  const batchSyncOrdersToGoogleSheets = useCallback(
    async (sheet: Sheet, items: SyncQueueItem[]) => {
      const { columnMapping } = sheet.configuration
      const statusColumnHeader = columnMapping.status
      const orderNoteColumnHeader = columnMapping.orderNote

      if (!statusColumnHeader) {
        throw new Error(`No status column mapping found for sheet ${sheet.id}`)
      }

      const cachedData = cachedHeadersRef.current[sheet.id]
      if (!cachedData) {
        throw new Error(`No cached headers found for sheet ${sheet.id}. Please refresh the sheet data.`)
      }

      const headers = cachedData.headers
      const statusColumnIndex = headers.findIndex((header: string) => header === statusColumnHeader)
      const orderNoteColumnIndex = orderNoteColumnHeader
        ? headers.findIndex((header: string) => header === orderNoteColumnHeader)
        : -1

      if (statusColumnIndex === -1) {
        throw new Error(`Status column not found in headers for sheet ${sheet.id}`)
      }

      // Prepare batch updates
      const updates: Array<{ range: string; values: string[][] }> = []

      for (const item of items) {
        const { order, newStatus, note } = item

        if (!order.rowPosition) {
          throw new Error(`Cannot update order ${order.itemId} - no row position stored`)
        }

        // Add status update
        const statusColumnLetter = String.fromCharCode(65 + statusColumnIndex)
        const statusCellRange = `${sheet.tab_name}!${statusColumnLetter}${order.rowPosition}`
        const sheetStatus = newStatus === "NEED_REPAIR" ? "NEED REPAIR" : newStatus

        updates.push({
          range: statusCellRange,
          values: [[sheetStatus]],
        })

        // Add note update if provided
        if (note !== undefined && note !== order.orderNote && orderNoteColumnIndex !== -1) {
          const orderNoteColumnLetter = String.fromCharCode(65 + orderNoteColumnIndex)
          const orderNoteCellRange = `${sheet.tab_name}!${orderNoteColumnLetter}${order.rowPosition}`

          updates.push({
            range: orderNoteCellRange,
            values: [[note]],
          })
        }
      }

      // Execute batch update
      const batchResponse = await googleSheetsClient.batchUpdateSheetData(sheet.google_sheet_id, updates)

      if (!batchResponse.success) {
        throw new Error(`Failed to batch update sheet ${sheet.name}: ${batchResponse.error}`)
      }
    },
    [sheets],
  )

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (syncQueue.length > 0 || isSyncingRef.current) {
        e.preventDefault()
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?"
        return "You have unsaved changes. Are you sure you want to leave?"
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [syncQueue.length])

  const processSyncQueue = useCallback(async () => {
    // Use ref to check queue length immediately
    if (syncQueueRef.current.length === 0 || isSyncingRef.current) {
      console.log("[v0] Skipping sync - queue empty or already syncing")
      return
    }

    isSyncingRef.current = true
    setSyncStatus("syncing")
    setSyncError(null)

    // Get items from ref and clear both ref and state
    const itemsToProcess = [...syncQueueRef.current]
    syncQueueRef.current = []
    setSyncQueue([])

    console.log("[v0] Processing", itemsToProcess.length, "queued items")

    try {
      const itemsBySheet = itemsToProcess.reduce(
        (acc, item) => {
          const sheetId = item.order.sheetId
          if (!acc[sheetId]) acc[sheetId] = []
          acc[sheetId].push(item)
          return acc
        },
        {} as Record<string, SyncQueueItem[]>,
      )

      // Process each sheet's items
      for (const [sheetId, items] of Object.entries(itemsBySheet)) {
        const sheet = sheets.find((s) => s.id === sheetId)
        if (!sheet) {
          console.error(`[v0] Sheet not found for items in sheet ${sheetId}`)
          throw new Error(`Sheet not found for items in sheet ${sheetId}`)
        }

        console.log(`[v0] Processing ${items.length} items for sheet ${sheet.name}`)

        // Handle NEED_REPAIR API calls first (these can't be batched)
        for (const item of items) {

            console.log(`[v0] Calling API for update order ${item.order.itemId}`)
            await callOrderAPI("/orders", {
              method: "POST",
              body: {
                itemId: item.order.itemId,
                googleSheetId: sheet.google_sheet_id,
                status: item.newStatus,
                changeType: item.changeType,
                orderNote: item.note || item.order.orderNote,
                designer: item.order.designer,
                designLink: item.order.designLink,
                mockup: item.order.mockup,
                customerImage: item.order.customerImage,
                personalization: item.order.personalization,
                date: item.order.date,
                store: item.order.store,
                productImage: item.order.productImage,
                productType: item.order.productType,
                productName: item.order.productName,
              },
            })
          
        }

        if (items.length === 1) {
          // Single update - use existing method
          const item = items[0]
          console.log(`[v0] Syncing single order ${item.order.itemId} to Google Sheets`)
          await syncOrderToGoogleSheets(item.order, item.newStatus, item.note)
        } else {
          // Multiple updates - use batch update
          console.log(`[v0] Batch syncing ${items.length} orders to Google Sheets`)
          await batchSyncOrdersToGoogleSheets(sheet, items)
        }
      }

      console.log("[v0] Sync completed successfully")
      setSyncStatus("success")

      // Show success status briefly
      setTimeout(() => {
        setSyncStatus("idle")
      }, 3000)
    } catch (error) {
      console.error("[v0] Sync failed:", error)
      setSyncStatus("error")
      setSyncError(error instanceof Error ? error.message : "Sync failed")

      syncQueueRef.current = [...itemsToProcess, ...syncQueueRef.current]
      setSyncQueue((prev) => [...itemsToProcess, ...prev])
    } finally {
      isSyncingRef.current = false

      if (syncQueueRef.current.length > 0) {
        console.log("[v0] New items in queue, processing again in 100ms")
        setTimeout(() => {
          processSyncQueue()
        }, 100)
      }
    }
  }, [sheets, syncOrderToGoogleSheets, batchSyncOrdersToGoogleSheets, callOrderAPI])

  const normalizeStatus = useCallback((status: string): Order["status"] | null => {
    const normalizedStatus = status.toUpperCase().trim()

    // Map various status formats to our standard ones
    const statusMap: Record<string, Order["status"]> = {
      // Standard statuses
      DESIGNED: "DESIGNED",
      NEED_REPAIR: "NEED_REPAIR",
      CONFIRMED: "CONFIRMED",
      DESIGNING: "DESIGNING",
    }

    const mappedStatus = statusMap[normalizedStatus]
    if (mappedStatus) {
      return mappedStatus
    }

    return status as Order["status"]
  }, [])

  const transformRowToOrder = useCallback(
    (
      row: any[],
      headers: string[],
      columnMapping: any,
      sheetId: string,
      rowIndex: number,
      dataStartRow: number,
    ): Order | null => {
      try {
        const getColumnValue = (fieldName: string): string => {
          const columnHeader = columnMapping[fieldName]
          if (!columnHeader) {
            return ""
          }

          // Find the column index based on the header name
          const columnIndex = headers.findIndex((header) => header === columnHeader)

          if (columnIndex === -1) {
            return ""
          }

          if (columnIndex >= row.length) {
            return ""
          }

          const value = row[columnIndex]?.toString().trim() || ""
          return value
        }

        const itemId = getColumnValue("itemId")
        const rawStatus = getColumnValue("status")

        // Skip rows without required fields
        if (!itemId || !rawStatus) {
          return null
        }

        // Normalize status
        const status = normalizeStatus(rawStatus)
        if (!status) {
          return null
        }

        const actualRowPosition = dataStartRow + rowIndex

        const order: Order = {
          itemId,
          sheetId,
          status,
          orderNote: getColumnValue("orderNote"),
          designer: getColumnValue("designer"),
          designLink: getColumnValue("design"),
          mockup: getColumnValue("mockup"),
          customerImage: getColumnValue("customerImage"),
          personalization: getColumnValue("personalization"),
          date: getColumnValue("date"),
          store: getColumnValue("store"),
          productImage: getColumnValue("image"),
          productType: getColumnValue("productType"),
          productName: getColumnValue("productName"),
          rowPosition: actualRowPosition,
        }

        return order
      } catch (error) {
        return null
      }
    },
    [normalizeStatus],
  )

  useEffect(() => {
    const savedFilters = loadFiltersFromStorage()
    setState((prev) => ({
      ...prev,
      filters: savedFilters,
    }))
  }, [loadFiltersFromStorage])

  // Load orders from selected sheet
  const loadOrdersFromSheet = useCallback(
    async (sheet: Sheet) => {
      const startTime = Date.now()
      setState((prev) => ({ ...prev, loading: true, error: null }))
      setLoadingTime(null)
      setHasAutoFiltered(false)

      try {
        const { configuration } = sheet
        const { columnMapping, dataRange, readDirection, maxRowsPerLoad } = configuration

        const headerRow = dataRange.headerRow || 1
        const columns = dataRange.columns || "A:Z"
        const [startCol, endCol] = columns.split(":")

        let range: string
        let actualEndRow: number

        if (readDirection === "top-to-bottom") {
          const maxEndRow = dataRange.endRow || 10000 // Use a large number if no end row specified

          const dataLoadStartRow = Math.max(headerRow + 1, maxEndRow - maxRowsPerLoad + 1)
          actualEndRow = maxEndRow

          range = `${sheet.tab_name}!${startCol}${headerRow}:${endCol}${actualEndRow}`
        } else {
          const dataStartRow = dataRange.startRow || headerRow + 1
          actualEndRow = Math.min(dataStartRow + maxRowsPerLoad - 1, dataRange.endRow || 1000)

          range = `${sheet.tab_name}!${startCol}${headerRow}:${endCol}${actualEndRow}`
        }

        const response = await googleSheetsClient.getSheetData(sheet.google_sheet_id, range)

        if (!response.success) {
          if (response.error?.includes("PERMISSION_DENIED")) {
            throw new Error(
              "Permission denied. Please ensure the Google Sheets token has access to this spreadsheet and try reconnecting your Google account.",
            )
          }
          throw new Error(response.error || "Failed to load sheet data")
        }

        const rows = response.data?.values || []
        if (rows.length === 0) {
          const loadTime = Date.now() - startTime
          setLoadingTime(loadTime)
          setState((prev) => ({
            ...prev,
            orders: [],
            filteredOrders: [],
            totalCount: 0,
            loading: false,
            lastSync: new Date().toISOString(),
            selectedSheet: sheet.id,
          }))
          setPagination({ page: 1, pageSize: 50, totalPages: 0 }) // Changed from 10 to 50
          return
        }

        const headerRowIndex = headerRow - 1
        if (headerRowIndex >= rows.length) {
          throw new Error(`Header row ${headerRow} not found in sheet data`)
        }

        const headers = rows[headerRowIndex] || []

        cachedHeadersRef.current[sheet.id] = {
          headers,
          timestamp: Date.now(),
          columnMapping,
        }

        let dataRows: any[]

        if (readDirection === "top-to-bottom") {
          dataRows = rows.slice(headerRowIndex + 1)
        } else {
          const dataStartRow = dataRange.startRow || headerRow + 1
          const dataStartIndex = dataStartRow - 1
          dataRows = rows.slice(dataStartIndex)
        }

        const orders: Order[] = []
        const statusCounts: Record<string, number> = {}

        const actualDataStartRow = headerRow + 1

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i]
          if (!row || row.length === 0) continue // Skip empty rows

          const order = transformRowToOrder(row, headers, columnMapping, sheet.id, i, actualDataStartRow)
          if (order) {
            orders.push(order)
            statusCounts[order.status] = (statusCounts[order.status] || 0) + 1
          }
        }

        const loadTime = Date.now() - startTime
        setLoadingTime(loadTime)

        const savedFilters = loadFiltersFromStorage()
        const filteredOrders = orders.filter((order) => {
          if (savedFilters.status && savedFilters.status.length > 0) {
            return savedFilters.status.includes(order.status)
          }
          // Fallback to DESIGNED and REPAIRED if no status filter
          return order.status === "DESIGNED" || order.status === "REPAIRED"
        })

        setState((prev) => ({
          ...prev,
          orders,
          filteredOrders,
          totalCount: orders.length,
          loading: false,
          lastSync: new Date().toISOString(),
          selectedSheet: sheet.id,
          filters: savedFilters,
        }))

        // Reset pagination with filtered count
        setPagination({ page: 1, pageSize: 50, totalPages: Math.ceil(filteredOrders.length / 50) })
      } catch (error) {
        const loadTime = Date.now() - startTime
        setLoadingTime(loadTime)
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to load orders",
        }))
      }
    },
    [transformRowToOrder, loadFiltersFromStorage],
  )

  const applyFilters = useCallback(
    (filters: OrderFilters) => {
      saveFiltersToStorage(filters)

      setState((prev) => {
        let filtered = [...prev.orders]

        // Status filter
        if (filters.status && filters.status.length > 0) {
          filtered = filtered.filter((order) => filters.status!.includes(order.status))
        }

        // Designer filter
        if (filters.designer && filters.designer.length > 0) {
          filtered = filtered.filter((order) => order.designer && filters.designer!.includes(order.designer))
        }

        // Product type filter
        if (filters.productType && filters.productType.length > 0) {
          filtered = filtered.filter((order) => order.productType && filters.productType!.includes(order.productType))
        }

        // Store filter
        if (filters.store && filters.store.length > 0) {
          filtered = filtered.filter((order) => order.store && filters.store!.includes(order.store))
        }

        // Date range filter
        if (filters.dateRange?.from || filters.dateRange?.to) {
          filtered = filtered.filter((order) => {
            if (!order.date) return false
            const orderDate = new Date(order.date)
            if (filters.dateRange?.from && orderDate < new Date(filters.dateRange.from)) return false
            if (filters.dateRange?.to && orderDate > new Date(filters.dateRange.to)) return false
            return true
          })
        }

        // Search query filter
        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase()
          filtered = filtered.filter(
            (order) =>
              order.itemId.toLowerCase().includes(query) ||
              order.orderNote?.toLowerCase().includes(query) ||
              order.personalization?.toLowerCase().includes(query) ||
              order.productName?.toLowerCase().includes(query) ||
              order.designer?.toLowerCase().includes(query) ||
              order.store?.toLowerCase().includes(query),
          )
        }

        const newTotalPages = Math.ceil(filtered.length / pagination.pageSize)
        setPagination((prev) => ({
          ...prev,
          page: 1, // Reset to first page when filters change
          totalPages: newTotalPages,
        }))

        return {
          ...prev,
          filteredOrders: filtered,
          filters,
        }
      })
    },
    [pagination.pageSize, saveFiltersToStorage],
  )

  const getFilterOptions = useCallback(() => {
    const { orders } = state

    const options = {
      statuses: [...new Set(orders.map((o) => o.status))],
      designers: [...new Set(orders.map((o) => o.designer).filter(Boolean))],
      productTypes: [...new Set(orders.map((o) => o.productType).filter(Boolean))],
      stores: [...new Set(orders.map((o) => o.store).filter(Boolean))],
    }

    return options
  }, [state])

  const getPaginatedOrders = useCallback(() => {
    if (pagination.pageSize === -1) {
      return state.filteredOrders
    }

    const startIndex = (pagination.page - 1) * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    return state.filteredOrders.slice(startIndex, endIndex)
  }, [state, pagination])

  const changePageSize = useCallback(
    (newPageSize: number) => {
      setPagination((prev) => ({
        page: 1, // Reset to first page
        pageSize: newPageSize,
        totalPages: newPageSize === -1 ? 1 : Math.ceil(state.filteredOrders.length / newPageSize),
      }))
    },
    [state],
  )

  const changePage = useCallback((newPage: number) => {
    setPagination((prev) => ({
      ...prev,
      page: Math.max(1, Math.min(newPage, prev.totalPages)),
    }))
  }, [])

  // Refresh current sheet data
  const refreshData = useCallback(async () => {
    if (!state.selectedSheet) return

    if (cachedHeadersRef.current[state.selectedSheet]) {
      delete cachedHeadersRef.current[state.selectedSheet]
    }

    const sheet = sheets.find((s) => s.id === state.selectedSheet)
    if (sheet) {
      await loadOrdersFromSheet(sheet)
    }
  }, [state.selectedSheet, sheets, loadOrdersFromSheet])

  const updateOrderStatus = useCallback(
    async (
      order: Order,
      newStatus: Order["status"],
      note?: string,
      changeType?: "design_error" | "customer_change",
    ): Promise<boolean> => {
      try {
        if (newStatus === "NEED_REPAIR" && !changeType) {
          console.error("[v0] Change type required for NEED_REPAIR status")
          return false
        }

        if (!order.rowPosition) {
          console.error("[v0] Cannot update order without row position")
          return false
        }

        const syncItem: SyncQueueItem = {
          id: `${order.itemId}-${Date.now()}`,
          order,
          newStatus,
          note,
          changeType,
          timestamp: Date.now(),
        }

        const existingIndex = syncQueueRef.current.findIndex(
          (item) => item.order.itemId === syncItem.order.itemId && item.order.sheetId === syncItem.order.sheetId,
        )

        if (existingIndex !== -1) {
          console.log(`[v0] Replacing existing queue item for order ${order.itemId}`)
          syncQueueRef.current[existingIndex] = syncItem
        } else {
          console.log(`[v0] Adding new queue item for order ${order.itemId}`)
          syncQueueRef.current.push(syncItem)
        }

        setSyncQueue([...syncQueueRef.current])

        setState((prev) => {
          const updatedOrders = prev.orders.map((o) =>
            o.itemId === order.itemId && o.sheetId === order.sheetId
              ? {
                  ...o,
                  status: newStatus,
                  orderNote: note !== undefined ? note : o.orderNote,
                }
              : o,
          )

          let filteredOrders = [...updatedOrders]
          if (prev.filters.status && prev.filters.status.length > 0) {
            filteredOrders = filteredOrders.filter((o) => prev.filters.status!.includes(o.status))
          }

          return {
            ...prev,
            orders: updatedOrders,
            filteredOrders,
          }
        })

        if (!isSyncingRef.current) {
          console.log(`[v0] Triggering immediate sync for order ${order.itemId}`)
          // Use setTimeout with 0ms to allow state updates to complete but trigger immediately
          setTimeout(() => processSyncQueue(), 0)
        }

        return true
      } catch (error) {
        console.error("[v0] Error updating order status:", error)
        return false
      }
    },
    [processSyncQueue],
  )

  const triggerManualSync = useCallback(async () => {
    if (syncQueueRef.current.length > 0) {
      await processSyncQueue()
    }
  }, [processSyncQueue])

  return {
    // State
    orders: getPaginatedOrders(),
    allOrders: state.orders,
    filteredOrders: state.filteredOrders,
    filters: state.filters,
    selectedSheet: state.selectedSheet,
    loading: state.loading || sheetsLoading,
    error: state.error || sheetsError,
    totalCount: state.totalCount,
    filteredCount: state.filteredOrders.length,
    lastSync: state.lastSync,
    loadingTime,

    syncStatus,
    syncError,
    pendingChanges: syncQueue.length,
    triggerManualSync,

    // Pagination
    pagination,
    changePageSize,
    changePage,

    // Available data
    sheets,
    filterOptions: getFilterOptions(),

    // Actions
    loadOrdersFromSheet,
    applyFilters,
    refreshData,
    updateOrderStatus,

    // API loading state
    apiLoading,
  }
}
