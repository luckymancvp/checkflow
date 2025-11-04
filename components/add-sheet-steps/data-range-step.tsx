"use client"

import type React from "react"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface DataRangeStepProps {
  configuration: any
  updateConfiguration: (config: any) => void
}

const DataRangeStep: React.FC<DataRangeStepProps> = ({ configuration, updateConfiguration }) => {
  return (
    <div>
      {/* Reading Direction */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Reading Direction</Label>
        <p className="text-xs text-gray-600 mb-3">
          Choose based on how new orders are added to your sheet. App will always process old orders first.
        </p>
        <RadioGroup
          value={configuration.readDirection}
          onValueChange={(value: "top-to-bottom" | "bottom-to-top") => updateConfiguration({ readDirection: value })}
          className="space-y-3"
        >
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="top-to-bottom" id="top-to-bottom" className="mt-1" />
            <Label htmlFor="top-to-bottom" className="flex-1 cursor-pointer">
              <div className="p-3 border rounded-lg hover:bg-gray-50">
                <div className="font-medium mb-1">Top to Bottom</div>
                <div className="text-sm text-gray-600">
                  Use when new orders are added at the <strong>bottom</strong> of your sheet.
                  <br />
                  <span className="text-xs text-gray-500">(App reads from top = oldest orders first)</span>
                </div>
              </div>
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <RadioGroupItem value="bottom-to-top" id="bottom-to-top" className="mt-1" />
            <Label htmlFor="bottom-to-top" className="flex-1 cursor-pointer">
              <div className="p-3 border rounded-lg hover:bg-gray-50">
                <div className="font-medium mb-1">Bottom to Top</div>
                <div className="text-sm text-gray-600">
                  Use when new orders are added at the <strong>top</strong> of your sheet.
                  <br />
                  <span className="text-xs text-gray-500">(App reads from bottom = oldest orders first)</span>
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  )
}

export default DataRangeStep

// keep default export for consistency
export { DataRangeStep }
