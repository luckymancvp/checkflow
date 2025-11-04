"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, AlertTriangle, Plus, RefreshCw } from "lucide-react"
import { SheetCard, type Sheet } from "./sheet-card"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useSheets } from "@/hooks/use-sheets"

interface SheetListProps {
  onAddSheet: () => void
  onEditSheet: (sheet: Sheet) => void
}

export function SheetList({ onAddSheet, onEditSheet }: SheetListProps) {
  const { sheets, loading, error, mutationLoading, refetch, deleteSheet } = useSheets()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [sheetToDelete, setSheetToDelete] = useState<Sheet | null>(null)

  const handleEdit = (sheet: Sheet) => {
    onEditSheet(sheet)
  }

  const handleDeleteClick = (sheet: Sheet) => {
    setSheetToDelete(sheet)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!sheetToDelete) return

    const result = await deleteSheet(sheetToDelete)

    if (result.success) {
      setSheetToDelete(null)
      setIsDeleteDialogOpen(false)
    }
  }

  const handleDeleteCancel = () => {
    setSheetToDelete(null)
    setIsDeleteDialogOpen(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-pink-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading sheet configurations...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-600">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">Failed to load sheets</p>
        <p className="text-sm text-gray-500 mt-2">{error}</p>
        <Button onClick={refetch} variant="outline" className="mt-4 bg-transparent">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (sheets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Plus className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No sheets configured yet</h3>
        <p className="text-gray-500 mb-4">Get started by adding your first Google Sheet integration.</p>
        <Button onClick={onAddSheet} className="bg-pink-600 hover:bg-pink-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Your First Sheet
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sheets.map((sheet) => (
          <SheetCard
            key={sheet.id}
            sheet={sheet}
            onEdit={() => handleEdit(sheet)}
            onDelete={() => handleDeleteClick(sheet)}
          />
        ))}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the sheet configuration
              <span className="font-semibold text-gray-900"> {sheetToDelete?.name}</span> and remove its data from our
              servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel} disabled={mutationLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={mutationLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {mutationLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
