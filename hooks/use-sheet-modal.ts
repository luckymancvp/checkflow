"use client"

import { useState } from "react"
import type { Sheet } from "@/components/sheet-card"

export function useSheetModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [sheetToEdit, setSheetToEdit] = useState<Sheet | null>(null)

  const openAddModal = () => {
    setSheetToEdit(null)
    setIsOpen(true)
  }

  const openEditModal = (sheet: Sheet) => {
    setSheetToEdit(sheet)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
    setSheetToEdit(null)
  }

  const handleSuccess = () => {
    // Simple refresh for now - could be improved with optimistic updates
    window.location.reload()
  }

  return {
    isOpen,
    sheetToEdit,
    openAddModal,
    openEditModal,
    closeModal,
    handleSuccess,
  }
}
