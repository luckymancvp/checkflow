"use client"

import { useState, useEffect, useCallback } from "react"
import { googleSheetsClient } from "@/lib/google-sheets-client"

interface UseGoogleSheetsResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useGoogleSheets<T = any>(
  operation: () => Promise<{ success: boolean; data?: T; error?: string }>,
  dependencies: any[] = [],
): UseGoogleSheetsResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await operation()

      if (result.success) {
        setData(result.data || null)
      } else {
        setError(result.error || "Unknown error")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, dependencies)

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  }
}

// Specific hooks for common operations
export function useSpreadsheet(spreadsheetId: string) {
  return useGoogleSheets(() => googleSheetsClient.getSpreadsheet(spreadsheetId), [spreadsheetId])
}

export function useSheetTabs(spreadsheetId: string) {
  return useGoogleSheets(() => googleSheetsClient.getSheetTabs(spreadsheetId), [spreadsheetId])
}

export function useSheetData(spreadsheetId: string, range: string) {
  return useGoogleSheets(() => googleSheetsClient.getSheetData(spreadsheetId, range), [spreadsheetId, range])
}

// Hook for manual operations
export function useGoogleSheetsOperations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateData = useCallback(async (spreadsheetId: string, range: string, values: any[][]) => {
    try {
      setLoading(true)
      setError(null)

      const result = await googleSheetsClient.updateSheetData(spreadsheetId, range, values)

      if (!result.success) {
        setError(result.error || "Update failed")
        return false
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const clearTokens = useCallback(() => {
    googleSheetsClient.clearTokens()
  }, [])

  return {
    updateData,
    clearTokens,
    loading,
    error,
  }
}
