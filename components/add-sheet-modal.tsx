"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { BasicInformationStep } from "./add-sheet-steps/basic-information-step"
import { SheetSelectionStep } from "./add-sheet-steps/sheet-selection-step"
import { SyncStrategyStep } from "./add-sheet-steps/sync-strategy-step"
import { DataRangeStep } from "./add-sheet-steps/data-range-step"
import { ColumnMappingStep } from "./add-sheet-steps/column-mapping-step"
import { useApiMutation } from "@/hooks/use-api"
import type { Sheet } from "./sheet-card"

interface AddSheetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  sheetToEdit?: Sheet | null
}

export interface SheetConfiguration {
  // Step 1: Basic Information
  id?: string
  name: string
  description: string
  googleSheetUrl: string
  googleSheetId: string
  isEditing?: boolean // Add flag to track editing mode

  // Step 2: Sheet Selection
  selectedTab: string
  sheetMetadata?: {
    title: string
    sheets: Array<{
      properties: {
        title: string
        sheetId: number
        gridProperties: {
          rowCount: number
          columnCount: number
        }
      }
    }>
  }

  // Step 3: Sync Strategy
  syncStrategy: "date-based" | "row-based"
  syncRange: string

  // Step 4: Data Range
  headerRow: number
  startRow: number
  endRow: number | null
  columns: string
  readDirection: "top-to-bottom" | "bottom-to-top"
  maxRowsPerLoad: number

  // Step 5: Column Mapping
  columnMapping: {
    itemId: string
    status: string
    orderNote: string
    designer: string
    design: string
    customerImage: string
    personalization: string
    date: string
    store: string
    image: string
    productType: string
    productName: string
  }
  detectedHeaders?: string[]
  sampleData?: Record<string, string>[]
}

const STEPS = [
  { id: 1, title: "Basic Information", description: "Sheet details and system access" },
  { id: 2, title: "Sheet Selection", description: "Choose sheet tab and preview data" },
  { id: 3, title: "Sync Strategy", description: "Configure data synchronization" },
  { id: 4, title: "Data Range", description: "Set processing parameters" },
  { id: 5, title: "Column Mapping", description: "Map fields to sheet columns" },
]

export function AddSheetModal({ open, onOpenChange, onSuccess, sheetToEdit }: AddSheetModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const { mutate, loading: mutationLoading } = useApiMutation()
  const [configuration, setConfiguration] = useState<SheetConfiguration>({
    name: "",
    description: "",
    googleSheetUrl: "",
    googleSheetId: "",
    selectedTab: "",
    syncStrategy: "date-based",
    syncRange: "60-days",
    headerRow: 1,
    startRow: 2,
    endRow: null,
    columns: "A:AW",
    readDirection: "top-to-bottom",
    maxRowsPerLoad: 500,
    columnMapping: {
      itemId: "",
      status: "",
      orderNote: "",
      designer: "",
      design: "",
      customerImage: "",
      personalization: "",
      date: "",
      store: "",
      image: "",
      productType: "",
      productName: "",
    },
  })

  useEffect(() => {
    if (open) {
      if (sheetToEdit) {
        // Construct Google Sheets URL from sheet ID for editing
        const constructedUrl = `https://docs.google.com/spreadsheets/d/${sheetToEdit.google_sheet_id}/edit`

        // Load existing sheet data for editing
        setConfiguration({
          id: sheetToEdit.id,
          name: sheetToEdit.name,
          description: sheetToEdit.description,
          googleSheetUrl: constructedUrl,
          googleSheetId: sheetToEdit.google_sheet_id,
          selectedTab: sheetToEdit.tab_name,
          syncStrategy: sheetToEdit.configuration.syncStrategy,
          syncRange: sheetToEdit.configuration.syncRange,
          headerRow: sheetToEdit.configuration.dataRange.headerRow,
          startRow: sheetToEdit.configuration.dataRange.startRow,
          endRow: sheetToEdit.configuration.dataRange.endRow,
          columns: sheetToEdit.configuration.dataRange.columns,
          readDirection: sheetToEdit.configuration.readDirection,
          maxRowsPerLoad: sheetToEdit.configuration.maxRowsPerLoad,
          columnMapping: sheetToEdit.configuration.columnMapping,
          isEditing: true, // Set editing flag
        })
        setCurrentStep(1)
      } else {
        // Reset form for adding new sheet
        setConfiguration({
          name: "",
          description: "",
          googleSheetUrl: "",
          googleSheetId: "",
          selectedTab: "",
          syncStrategy: "date-based",
          syncRange: "60-days",
          headerRow: 1,
          startRow: 2,
          endRow: null,
          columns: "A:AW",
          readDirection: "top-to-bottom",
          maxRowsPerLoad: 500,
          columnMapping: {
            itemId: "",
            status: "",
            orderNote: "",
            designer: "",
            design: "",
            customerImage: "",
            personalization: "",
            date: "",
            store: "",
            image: "",
            productType: "",
            productName: "",
          },
          isEditing: false,
        })
        setCurrentStep(1)
      }
    }
  }, [open, sheetToEdit])

  const updateConfiguration = (updates: Partial<SheetConfiguration>) => {
    setConfiguration((prev) => ({ ...prev, ...updates }))
  }

  const safeTrim = (v?: string) => (v ?? "").trim()

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        // For editing, we don't need to validate URL since it's auto-constructed
        if (configuration.isEditing) {
          return safeTrim(configuration.name) && safeTrim(configuration.googleSheetId)
        }
        return (
          safeTrim(configuration.name) &&
          safeTrim(configuration.googleSheetUrl) &&
          safeTrim(configuration.googleSheetId)
        )
      case 2:
        return configuration.selectedTab.trim()
      case 3:
        return configuration.syncStrategy && configuration.syncRange
      case 4:
        return configuration.headerRow > 0 && configuration.startRow > 0
      case 5:
        return (
          configuration.columnMapping.itemId &&
          configuration.columnMapping.status &&
          configuration.columnMapping.designer
        )
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < STEPS.length && canProceedToNext()) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (!canProceedToNext()) return

    setIsLoading(true)
    try {
      const method = sheetToEdit ? "PUT" : "POST"
      const url = sheetToEdit ? `/sheets/${sheetToEdit.id}` : "/sheets"

      await mutate(url, {
        method: method,
        body: {
          name: configuration.name,
          description: configuration.description,
          googleSheetId: configuration.googleSheetId,
          tabName: configuration.selectedTab,
          configuration: {
            syncStrategy: configuration.syncStrategy,
            syncRange: configuration.syncRange,
            columnMapping: configuration.columnMapping,
            dataRange: {
              startRow: configuration.startRow,
              endRow: configuration.endRow,
              headerRow: configuration.headerRow,
              columns: configuration.columns,
            },
            readDirection: configuration.readDirection,
            maxRowsPerLoad: configuration.maxRowsPerLoad,
          },
        },
      })

      onSuccess?.()
      handleClose()
    } catch (error) {
      console.error("Failed to save sheet:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInformationStep
            configuration={configuration}
            updateConfiguration={updateConfiguration}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )
      case 2:
        return (
          <SheetSelectionStep
            configuration={configuration}
            updateConfiguration={updateConfiguration}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )
      case 3:
        return <SyncStrategyStep configuration={configuration} updateConfiguration={updateConfiguration} />
      case 4:
        return <DataRangeStep configuration={configuration} updateConfiguration={updateConfiguration} />
      case 5:
        return (
          <ColumnMappingStep
            configuration={configuration}
            updateConfiguration={updateConfiguration}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )
      default:
        return null
    }
  }

  const progress = (currentStep / STEPS.length) * 100

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">{sheetToEdit ? "Edit Sheet" : "Add New Sheet"}</DialogTitle>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                Step {currentStep} of {STEPS.length}
              </span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-between mt-4 px-2">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.id === currentStep
                      ? "bg-pink-600 text-white"
                      : step.id < currentStep
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step.id}
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${step.id < currentStep ? "bg-green-600" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Current Step Info */}
          <div className="text-center mt-4">
            <h3 className="font-medium text-gray-900">{STEPS[currentStep - 1].title}</h3>
            <p className="text-sm text-gray-600">{STEPS[currentStep - 1].description}</p>
          </div>
        </DialogHeader>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-6">{renderCurrentStep()}</div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 1 || isLoading}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center space-x-3">
            <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>

            {currentStep === STEPS.length ? (
              <Button
                onClick={handleSubmit}
                disabled={!canProceedToNext() || isLoading || mutationLoading}
                className="bg-pink-600 hover:bg-pink-700"
              >
                {isLoading || mutationLoading
                  ? sheetToEdit
                    ? "Updating..."
                    : "Creating..."
                  : sheetToEdit
                    ? "Update Sheet"
                    : "Create Sheet"}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceedToNext() || isLoading}
                className="bg-pink-600 hover:bg-pink-700"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
