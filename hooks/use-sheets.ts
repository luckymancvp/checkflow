"use client"

import { useApi, useApiMutation } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { googleSheetsClient } from "@/lib/google-sheets-client"
import type { Sheet } from "@/components/sheet-card"

interface SheetListResponse {
  success: boolean
  data: Sheet[]
  error?: string
}

export function useSheets() {
  const { data, loading, error, refetch } = useApi<SheetListResponse>("/sheets")
  const { mutate, loading: mutationLoading } = useApiMutation()
  const { toast } = useToast()

  const deleteSheet = async (sheet: Sheet) => {
    try {
      await mutate(`/sheets/${sheet.id}`, {
        method: "DELETE",
      })

      toast({
        title: "Sheet Deleted",
        description: `Sheet "${sheet.name}" has been successfully deleted.`,
      })

      refetch()
      return { success: true }
    } catch (err: any) {
      toast({
        title: "Failed to Delete Sheet",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      })
      return { success: false, error: err.message }
    }
  }

  const checkAccess = async () => {
    try {
      // Try to make a simple API call to verify tokens and access
      // This will trigger the token refresh flow if needed
      const testResult = await googleSheetsClient.getSpreadsheet("test")

      // Even if the specific spreadsheet doesn't exist, if we get a proper API response
      // (not an auth error), it means our tokens are working
      if (
        testResult.success ||
        (testResult.error && !testResult.error.includes("401") && !testResult.error.includes("403"))
      ) {
        toast({
          title: "Access Verified",
          description: "Google Sheets access is working properly.",
        })
        return { success: true }
      } else {
        toast({
          title: "Access Check Failed",
          description: testResult.error || "Unable to verify Google Sheets access.",
          variant: "destructive",
        })
        return { success: false, error: testResult.error }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      toast({
        title: "Access Check Failed",
        description: errorMessage,
        variant: "destructive",
      })
      return { success: false, error: errorMessage }
    }
  }

  return {
    sheets: data?.data || [],
    loading,
    error,
    mutationLoading,
    refetch,
    deleteSheet,
    checkAccess,
  }
}
