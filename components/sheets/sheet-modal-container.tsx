"use client"

import { AddSheetModal } from "@/components/add-sheet-modal"
import type { Sheet } from "@/components/sheet-card"

interface SheetModalContainerProps {
  isOpen: boolean
  sheetToEdit: Sheet | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function SheetModalContainer({ isOpen, sheetToEdit, onOpenChange, onSuccess }: SheetModalContainerProps) {
  return <AddSheetModal open={isOpen} onOpenChange={onOpenChange} onSuccess={onSuccess} sheetToEdit={sheetToEdit} />
}
