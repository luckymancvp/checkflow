"use client"

import { SheetPageHeader } from "@/components/sheets/sheet-page-header"
import { SheetListContainer } from "@/components/sheets/sheet-list-container"
import { SheetModalContainer } from "@/components/sheets/sheet-modal-container"
import { useSheetModal } from "@/hooks/use-sheet-modal"

export default function SheetsPage() {
  const { isOpen, sheetToEdit, openAddModal, openEditModal, closeModal, handleSuccess } = useSheetModal()

  return (
    <div className="flex-1 space-y-6 p-6">
      <SheetPageHeader onAddSheet={openAddModal} />

      <SheetListContainer onAddSheet={openAddModal} onEditSheet={openEditModal} />

      <SheetModalContainer
        isOpen={isOpen}
        sheetToEdit={sheetToEdit}
        onOpenChange={closeModal}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
