"use client"

import type React from "react"
import { useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { LazyImage } from "@/components/ui/lazy-image"
import { RotateCw, Camera, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import type { Order } from "@/types/order"
import type { ViewMode, ActiveTab } from "@/types/order-review"
import { getImageUrl } from "@/utils/image-utils"
import { FloatingImage } from "./floating-image"

interface ImageViewerProps {
  order: Order
  viewMode: ViewMode
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  zoom: number
  setZoom: React.Dispatch<React.SetStateAction<number>>
  rotation: number
  setRotation: (rotation: number) => void
  panX: number
  setPanX: (x: number) => void
  panY: number
  setPanY: (y: number) => void
  isDragging: boolean
  setIsDragging: (dragging: boolean) => void
  dragStart: { x: number; y: number }
  setDragStart: (start: { x: number; y: number }) => void
  dragStartPan: { x: number; y: number }
  setDragStartPan: (start: { x: number; y: number }) => void
  screenshotTaken: boolean
  setScreenshotTaken: (taken: boolean) => void
  getCachedImageUrl: (url: string | null | undefined) => string | null
  onScreenshot?: () => void
  designUrls: string[]
  designIndex: number
  setDesignIndex: (index: number) => void
}

export function ImageViewer({
  order,
  viewMode,
  activeTab,
  setActiveTab,
  zoom,
  setZoom,
  rotation,
  setRotation,
  panX,
  setPanX,
  panY,
  setPanY,
  isDragging,
  setIsDragging,
  dragStart,
  setDragStart,
  dragStartPan,
  setDragStartPan,
  screenshotTaken,
  setScreenshotTaken,
  getCachedImageUrl,
  onScreenshot,
  designUrls,
  designIndex,
  setDesignIndex,
}: ImageViewerProps) {
  const imageContainerRef = useRef<HTMLDivElement>(null)

  const safeDesignIndex = designUrls.length > 0 ? Math.min(designIndex, designUrls.length - 1) : 0
  const currentDesignUrl = designUrls[safeDesignIndex] ?? order.designLink ?? null

  const goToPreviousDesign = () =>
    setDesignIndex((safeDesignIndex - 1 + designUrls.length) % designUrls.length)
  const goToNextDesign = () => setDesignIndex((safeDesignIndex + 1) % designUrls.length)

  const renderDesignNav = () =>
    designUrls.length > 1 ? (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/75 text-white rounded-full px-2 py-1 z-10">
        <button
          onClick={goToPreviousDesign}
          className="p-1 hover:bg-white/20 rounded-full transition-colors"
          title="Previous design"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-medium tabular-nums">
          {safeDesignIndex + 1} / {designUrls.length}
        </span>
        <button
          onClick={goToNextDesign}
          className="p-1 hover:bg-white/20 rounded-full transition-colors"
          title="Next design"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    ) : null

  useEffect(() => {
    const container = imageContainerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -10 : 10
      setZoom((prev) => Math.max(25, Math.min(800, prev + delta))) // Increased maximum zoom from 300% to 800% for better detail inspection
    }

    container.addEventListener("wheel", handleWheel, { passive: false })

    return () => {
      container.removeEventListener("wheel", handleWheel)
    }
  }, [setZoom])

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (zoom > 100) {
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      setDragStartPan({ x: panX, y: panY })
      e.preventDefault()
    }
  }

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 100) {
      const deltaX = e.clientX - dragStart.x
      const deltaY = e.clientY - dragStart.y
      setPanX(dragStartPan.x + deltaX)
      setPanY(dragStartPan.y + deltaY)
    }
  }

  const handleImageMouseUp = () => {
    setIsDragging(false)
  }

  const handleScreenshot = async () => {
    if (onScreenshot) {
      onScreenshot()
      return
    }

    if (!imageContainerRef.current) return

    try {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const container = imageContainerRef.current
      const containerRect = container.getBoundingClientRect()

      // Find the image element
      const imgElement = container.querySelector("img")
      if (!imgElement) return

      // Get the actual rendered image dimensions and position
      const imgRect = imgElement.getBoundingClientRect()

      const visibleLeft = Math.max(containerRect.left, imgRect.left)
      const visibleTop = Math.max(containerRect.top, imgRect.top)
      const visibleRight = Math.min(containerRect.right, imgRect.right)
      const visibleBottom = Math.min(containerRect.bottom, imgRect.bottom)

      const visibleWidth = Math.max(0, visibleRight - visibleLeft)
      const visibleHeight = Math.max(0, visibleBottom - visibleTop)

      // Set canvas size to match only the visible area
      canvas.width = visibleWidth
      canvas.height = visibleHeight

      // Create a new image to draw on canvas
      const img = new Image()
      img.crossOrigin = "anonymous"

      img.onload = () => {
        const scaleX = img.naturalWidth / imgRect.width
        const scaleY = img.naturalHeight / imgRect.height

        const sourceX = (visibleLeft - imgRect.left) * scaleX
        const sourceY = (visibleTop - imgRect.top) * scaleY
        const sourceWidth = visibleWidth * scaleX
        const sourceHeight = visibleHeight * scaleY

        // Draw only the visible portion of the image
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight, // Source rectangle
          0,
          0,
          visibleWidth,
          visibleHeight, // Destination rectangle
        )

        // Convert canvas to blob and copy to clipboard
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])

              // Show animation
              setScreenshotTaken(true)
              setTimeout(() => setScreenshotTaken(false), 1000)
            } catch (error) {
              console.error("Failed to copy screenshot to clipboard:", error)
            }
          }
        }, "image/png")
      }

      img.src = imgElement.src
    } catch (error) {
      console.error("Failed to take screenshot:", error)
    }
  }

  const renderImageTabs = () => {
    const images = [
      {
        key: "product" as ActiveTab,
        label: "Product",
        src: getImageUrl(order.productImage, "other"),
        available: !!order.productImage,
      },
      {
        key: "mockup" as ActiveTab,
        label: "Mockup",
        src: getCachedImageUrl(getImageUrl(order.mockup, "mockup")),
        available: !!order.mockup,
      },
      {
        key: "design" as ActiveTab,
        label: "Design",
        src: getCachedImageUrl(currentDesignUrl),
        available: designUrls.length > 0 || !!order.designLink,
      },
      {
        key: "customer" as ActiveTab,
        label: "Customer",
        src: getImageUrl(order.customerImage, "other"),
        available: !!order.customerImage,
      },
    ]

    return (
      <div className="space-y-4 h-full flex flex-col">
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200 flex-shrink-0">
          {images.map((img) => (
            <button
              key={img.key}
              onClick={() => setActiveTab(img.key)}
              disabled={!img.available}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === img.key
                  ? "border-blue-500 text-blue-600"
                  : img.available
                    ? "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    : "border-transparent text-gray-300 cursor-not-allowed"
              }`}
            >
              {img.label}
              {!img.available && " (N/A)"}
            </button>
          ))}
        </div>

        <div
          ref={imageContainerRef}
          className="relative bg-gray-50 rounded-lg flex-1 flex items-center justify-center min-h-0 overflow-hidden"
          onMouseDown={handleImageMouseDown}
          onMouseMove={handleImageMouseMove}
          onMouseUp={handleImageMouseUp}
          onMouseLeave={handleImageMouseUp}
          style={{ cursor: zoom > 100 ? (isDragging ? "grabbing" : "grab") : "default" }}
        >
          {(() => {
            const activeImage = images.find((img) => img.key === activeTab)
            if (!activeImage?.available || !activeImage.src) {
              return (
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">📷</div>
                  <p>No {activeImage?.label.toLowerCase()} image available</p>
                </div>
              )
            }

            return (
              <div className="relative w-full h-full flex items-center justify-center p-2">
                <div
                  className="relative max-w-full max-h-full flex items-center justify-center"
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg) translate(${panX}px, ${panY}px)`,
                    transition: isDragging ? "none" : "transform 0.3s ease",
                  }}
                >
                  <LazyImage
                    key={`${order.itemId}-${activeImage.key}${activeImage.key === "design" ? `-${safeDesignIndex}` : ""}`}
                    src={activeImage.src}
                    alt={activeImage.label}
                    className="max-w-none max-h-none w-auto h-auto rounded-lg shadow-lg select-none"
                    style={{
                      maxWidth: "90vw",
                      maxHeight: "80vh",
                      objectFit: "contain",
                    }}
                    fallbackSrc={`/placeholder.svg?height=600&width=800&text=${activeImage.label}`}
                    draggable={false}
                  />
                </div>

                <div className="absolute top-4 right-4 flex gap-2 z-10">
                  {activeTab === "mockup" && order.mockup && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(order.mockup, "_blank")}
                      className="bg-white/95 backdrop-blur-sm shadow-md hover:bg-white border-gray-200"
                      title="Open mockup in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  {activeTab === "design" && currentDesignUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(currentDesignUrl, "_blank")}
                      className="bg-white/95 backdrop-blur-sm shadow-md hover:bg-white border-gray-200"
                      title="Open design in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRotation(rotation + 90)}
                    className="bg-white/95 backdrop-blur-sm shadow-md hover:bg-white border-gray-200"
                    title="Rotate image clockwise (R)"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleScreenshot}
                    className={`bg-white/95 backdrop-blur-sm shadow-md hover:bg-white border-gray-200 transition-all duration-300 ${
                      screenshotTaken ? "bg-green-100 border-green-300 scale-110" : ""
                    }`}
                    title="Copy screenshot to clipboard"
                  >
                    <Camera
                      className={`h-4 w-4 transition-colors duration-300 ${screenshotTaken ? "text-green-600" : ""}`}
                    />
                  </Button>
                </div>

                {activeTab === "design" && renderDesignNav()}

                {zoom > 100 && (
                  <div className="absolute bottom-4 left-4 bg-black/75 text-white text-xs px-2 py-1 rounded">
                    Drag to pan • Scroll to zoom
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </div>
    )
  }

  const renderImageFloat = () => {
    const images = [
      {
        key: "product" as ActiveTab,
        label: "Product",
        src: getImageUrl(order.productImage, "other"),
        available: !!order.productImage,
      },
      {
        key: "mockup" as ActiveTab,
        label: "Mockup",
        src: getCachedImageUrl(getImageUrl(order.mockup, "mockup")),
        available: !!order.mockup,
      },
      {
        key: "design" as ActiveTab,
        label: "Design",
        src: getCachedImageUrl(currentDesignUrl),
        available: designUrls.length > 0 || !!order.designLink,
      },
      {
        key: "customer" as ActiveTab,
        label: "Customer",
        src: getImageUrl(order.customerImage, "other"),
        available: !!order.customerImage,
      },
    ]

    return (
      <div className="space-y-4 h-full flex flex-col">
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200 flex-shrink-0">
          {images.map((img) => (
            <button
              key={img.key}
              onClick={() => setActiveTab(img.key)}
              disabled={!img.available}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === img.key
                  ? "border-blue-500 text-blue-600"
                  : img.available
                    ? "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    : "border-transparent text-gray-300 cursor-not-allowed"
              }`}
            >
              {img.label}
              {!img.available && " (N/A)"}
            </button>
          ))}
        </div>

        <div
          ref={imageContainerRef}
          className="relative bg-gray-50 rounded-lg flex-1 flex items-center justify-center min-h-0 overflow-hidden"
          onMouseDown={handleImageMouseDown}
          onMouseMove={handleImageMouseMove}
          onMouseUp={handleImageMouseUp}
          onMouseLeave={handleImageMouseUp}
          style={{ cursor: zoom > 100 ? (isDragging ? "grabbing" : "grab") : "default" }}
        >
          {(() => {
            const activeImage = images.find((img) => img.key === activeTab)
            if (!activeImage?.available || !activeImage.src) {
              return (
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">📷</div>
                  <p>No {activeImage?.label.toLowerCase()} image available</p>
                </div>
              )
            }

            return (
              <div className="relative w-full h-full flex items-center justify-center p-2">
                <div
                  className="relative max-w-full max-h-full flex items-center justify-center"
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg) translate(${panX}px, ${panY}px)`,
                    transition: isDragging ? "none" : "transform 0.3s ease",
                  }}
                >
                  <LazyImage
                    key={`${order.itemId}-${activeImage.key}${activeImage.key === "design" ? `-${safeDesignIndex}` : ""}`}
                    src={activeImage.src}
                    alt={activeImage.label}
                    className="max-w-none max-h-none w-auto h-auto rounded-lg shadow-lg select-none"
                    style={{
                      maxWidth: "90vw",
                      maxHeight: "80vh",
                      objectFit: "contain",
                    }}
                    fallbackSrc={`/placeholder.svg?height=600&width=800&text=${activeImage.label}`}
                    draggable={false}
                  />
                </div>

                <div className="absolute top-4 right-4 flex gap-2 z-10">
                  {activeTab === "mockup" && order.mockup && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(order.mockup, "_blank")}
                      className="bg-white/95 backdrop-blur-sm shadow-md hover:bg-white border-gray-200"
                      title="Open mockup in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  {activeTab === "design" && currentDesignUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(currentDesignUrl, "_blank")}
                      className="bg-white/95 backdrop-blur-sm shadow-md hover:bg-white border-gray-200"
                      title="Open design in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRotation(rotation + 90)}
                    className="bg-white/95 backdrop-blur-sm shadow-md hover:bg-white border-gray-200"
                    title="Rotate image clockwise (R)"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleScreenshot}
                    className={`bg-white/95 backdrop-blur-sm shadow-md hover:bg-white border-gray-200 transition-all duration-300 ${
                      screenshotTaken ? "bg-green-100 border-green-300 scale-110" : ""
                    }`}
                    title="Copy screenshot to clipboard"
                  >
                    <Camera
                      className={`h-4 w-4 transition-colors duration-300 ${screenshotTaken ? "text-green-600" : ""}`}
                    />
                  </Button>
                </div>

                {activeTab === "design" && renderDesignNav()}

                {zoom > 100 && (
                  <div className="absolute bottom-4 left-4 bg-black/75 text-white text-xs px-2 py-1 rounded">
                    Drag to pan • Scroll to zoom
                  </div>
                )}
              </div>
            )
          })()}
        </div>

        {(designUrls.length > 0 || order.designLink) && (
          <FloatingImage
            order={order}
            activeTab="design"
            getCachedImageUrl={getCachedImageUrl}
            designUrls={designUrls}
            designIndex={safeDesignIndex}
            setDesignIndex={setDesignIndex}
          />
        )}
      </div>
    )
  }

  const renderImageStack = () => {
    const images = [
      {
        label: "Product Image",
        src: getImageUrl(order.productImage, "other"),
        originalSrc: order.productImage,
      },
      {
        label: "Mockup Image",
        src: getCachedImageUrl(getImageUrl(order.mockup, "mockup")),
        originalSrc: order.mockup,
      },
      ...(designUrls.length > 0
        ? designUrls.map((url, i) => ({
            label: designUrls.length > 1 ? `Design Image ${i + 1}` : "Design Image",
            src: getCachedImageUrl(url),
            originalSrc: url,
          }))
        : [
            {
              label: "Design Image",
              src: getImageUrl(order.designLink, "design"),
              originalSrc: order.designLink,
            },
          ]),
      {
        label: "Customer Image",
        src: getImageUrl(order.customerImage, "other"),
        originalSrc: order.customerImage,
      },
    ]

    return (
      <div className="space-y-6 h-full">
        {images.map((img, index) => (
          <div key={index} className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">{img.label}</h4>
            <div
              className="relative bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden"
              style={{ minHeight: "300px" }}
            >
              {img.src ? (
                <div className="relative w-full h-full flex items-center justify-center p-4">
                  <LazyImage
                    key={`${order.itemId}-${img.label}`}
                    src={img.src}
                    alt={img.label}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                    style={{ maxHeight: "500px" }}
                    fallbackSrc={`/placeholder.svg?height=400&width=600&text=${img.label}`}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => img.originalSrc && window.open(img.originalSrc, "_blank")}
                    className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm shadow-md hover:bg-white border-gray-200"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">📷</div>
                  <p>No {img.label.toLowerCase()} available</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return viewMode === "tabs" ? renderImageTabs() : viewMode === "float" ? renderImageFloat() : renderImageStack()
}
