"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SheetList } from "@/components/sheet-list"
import type { Sheet } from "@/components/sheet-card"

interface SheetListContainerProps {
  onAddSheet: () => void
  onEditSheet: (sheet: Sheet) => void
}

export function SheetListContainer({ onAddSheet, onEditSheet }: SheetListContainerProps) {
  return (
    <Card className="shadow-md border-0">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Configured Sheets</CardTitle>
        <CardDescription>Manage your Google Sheets integrations</CardDescription>
      </CardHeader>
      <CardContent>
        <SheetList onAddSheet={onAddSheet} onEditSheet={onEditSheet} />
      </CardContent>
    </Card>
  )
}
