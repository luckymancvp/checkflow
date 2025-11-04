"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface SheetPageHeaderProps {
  onAddSheet: () => void
}

export function SheetPageHeader({ onAddSheet }: SheetPageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Sheet Management</h1>
        <p className="text-gray-600 mt-1">Configure and manage Google Sheets integration for order processing.</p>
      </div>
      <div className="flex items-center space-x-3">
        <Button onClick={onAddSheet} className="bg-pink-600 hover:bg-pink-700 text-white shadow-md">
          <Plus className="h-4 w-4 mr-2" />
          Add Sheet
        </Button>
      </div>
    </div>
  )
}
