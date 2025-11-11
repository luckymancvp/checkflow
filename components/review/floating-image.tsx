"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { LazyImage } from "@/components/ui/lazy-image"
import { ExternalLink } from "lucide-react"
import type { Order } from "@/types/order"
import type { ActiveTab } from "@/types/order-review"
import { getImageUrl } from "@/utils/image-utils"

interface FloatingImageProps {
  order: Order
  activeTab: ActiveTab
  getCachedImageUrl: (url: string | null) => string | null
}

const FLOAT_POSITION_KEY = "orderReviewFloatPosition"

interface SavedFloatPosition {
  x: number
  y: number
  width: number
  height: number
}

export function FloatingImage({ order, activeTab, getCachedImageUrl }: FloatingImageProps) {
  const getSavedPosition = (): SavedFloatPosition => {
    try {
      const saved = localStorage.getItem(FLOAT_POSITION_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.error("Failed to load saved float position:", e)
    }
    // Default position
    return { x: 100, y: 100, width: 600, height: 400 }
  }

  const savedPos = getSavedPosition()
  const [position, setPosition] = useState({ x: savedPos.x, y: savedPos.y })
  const [size, setSize] = useState({ width: savedPos.width, height: savedPos.height })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const floatingRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const savedPosition: SavedFloatPosition = {
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
    }
    localStorage.setItem(FLOAT_POSITION_KEY, JSON.stringify(savedPosition))
  }, [position, size])

  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains("resize-handle")) return
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  const handleDrag = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizing(true)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    })
  }

  const handleResize = (e: MouseEvent) => {
    if (isResizing) {
      const deltaX = e.clientX - resizeStart.x
      const deltaY = e.clientY - resizeStart.y

      setSize({
        width: Math.max(300, resizeStart.width + deltaX),
        height: Math.max(200, resizeStart.height + deltaY),
      })
    }
  }

  const handleResizeEnd = () => {
    setIsResizing(false)
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDrag)
      window.addEventListener("mouseup", handleDragEnd)
    }
    return () => {
      window.removeEventListener("mousemove", handleDrag)
      window.removeEventListener("mouseup", handleDragEnd)
    }
  }, [isDragging, dragStart])

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleResize)
      window.addEventListener("mouseup", handleResizeEnd)
    }
    return () => {
      window.removeEventListener("mousemove", handleResize)
      window.removeEventListener("mouseup", handleResizeEnd)
    }
  }, [isResizing, resizeStart])

  const getImageSource = () => {
    switch (activeTab) {
      case "product":
        return getImageUrl(order.productImage, "other")
      case "mockup":
        return getCachedImageUrl(getImageUrl(order.mockup, "mockup"))
      case "design":
        return getCachedImageUrl(getImageUrl(order.designLink, "design"))
      case "customer":
        return getImageUrl(order.customerImage, "other")
      default:
        return null
    }
  }

  const getOriginalSource = () => {
    switch (activeTab) {
      case "product":
        return order.productImage
      case "mockup":
        return order.mockup
      case "design":
        return order.designLink
      case "customer":
        return order.customerImage
      default:
        return null
    }
  }

  const imageSrc = getImageSource()
  const originalSrc = getOriginalSource()

  if (!imageSrc) return null

  return (
    <div
      ref={floatingRef}
      className="fixed bg-white rounded-lg shadow-2xl border-2 border-gray-300 overflow-hidden z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
      }}
    >
      {/* Header */}
      <div
        className="bg-gray-100 border-b border-gray-300 px-3 py-2 flex items-center justify-between cursor-move select-none"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-700 capitalize">{activeTab}</span>
        </div>
        <div className="flex items-center gap-1">
          {originalSrc && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(originalSrc, "_blank")}
              className="h-6 w-6 p-0 hover:bg-gray-200"
              title="Open in new tab"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Image Content */}
      <div className="w-full h-[calc(100%-40px)] bg-gray-50 flex items-center justify-center p-2 overflow-hidden">
        <LazyImage
          key={`${order.itemId}-${activeTab}-float`}
          src={imageSrc}
          alt={activeTab}
          className="max-w-full max-h-full object-contain select-none"
          fallbackSrc={`/placeholder.svg?height=400&width=600&text=${activeTab}`}
          draggable={false}
        />
      </div>

      {/* Resize Handle */}
      <div
        className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={handleResizeStart}
        style={{
          background: "linear-gradient(135deg, transparent 50%, #9ca3af 50%)",
        }}
      />
    </div>
  )
}
