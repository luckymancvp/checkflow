"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  className?: string
  searchable?: boolean
  emptyText?: string
  maxLabelChips?: number
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  className,
  searchable = true,
  emptyText = "No options",
  maxLabelChips = 2,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const selected = new Set(value)
  const filteredOptions = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const toggle = (v: string) => {
    if (selected.has(v)) {
      onChange(value.filter((x) => x !== v))
    } else {
      onChange([...value, v])
    }
  }

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  const renderLabel = () => {
    if (value.length === 0) return <span className="text-gray-500">{placeholder}</span>
    if (value.length <= maxLabelChips) {
      return value.map((v) => options.find((o) => o.value === v)?.label || v).join(", ")
    }
    return `${value.length} selected`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("h-10 justify-between font-normal bg-transparent", className)}
        >
          <span className="truncate">{renderLabel()}</span>
          <span className="flex items-center gap-1">
            {value.length > 0 && (
              <X
                className="h-3 w-3 text-gray-400 hover:text-gray-700"
                onClick={clear}
                aria-label="Clear"
              />
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        {searchable && (
          <div className="p-2 border-b">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="h-8"
            />
          </div>
        )}
        <div className="max-h-64 overflow-y-auto py-1">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">{emptyText}</div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = selected.has(opt.value)
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => toggle(opt.value)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-gray-100 text-left"
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="h-4 w-4 text-pink-600 shrink-0 ml-2" />}
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
