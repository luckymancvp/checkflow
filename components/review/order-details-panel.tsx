"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { LazyImage } from "@/components/ui/lazy-image"
import { ExternalLink, FileText, Clock, User, History, Edit2, Check, X, Lightbulb } from "lucide-react"
import type { Order } from "@/types/order"
import type {
  OrderHistoryResponse,
  ProductHistoryResponse,
  ProductTypeNoteResponse,
  OrderHistoryEntry,
} from "@/types/order-review"
import { formatDate } from "@/utils/format-utils"
import { extractImageUrls } from "@/utils/image-utils"
import { OrderComments } from "@/components/review/order-comments"

interface OrderDetailsPanelProps {
  order: Order
  currentStatus: Order["status"]
  orderHistoryData: OrderHistoryResponse | null
  orderHistoryLoading: boolean
  orderHistoryError: string | null
  productHistoryData: ProductHistoryResponse | null
  productHistoryLoading: boolean
  productHistoryError: string | null
  productTypeNoteData: ProductTypeNoteResponse | null
  productTypeNoteLoading: boolean
  productTypeNoteError: string | null
  refetchProductTypeNote: () => void
  getCachedImageUrl: (url: string | null) => string | null
}

export function OrderDetailsPanel({
  order,
  currentStatus,
  orderHistoryData,
  orderHistoryLoading,
  orderHistoryError,
  productHistoryData,
  productHistoryLoading,
  productHistoryError,
  productTypeNoteData,
  productTypeNoteLoading,
  productTypeNoteError,
  refetchProductTypeNote,
  getCachedImageUrl,
}: OrderDetailsPanelProps) {
  const [productTypeNote, setProductTypeNote] = useState("")
  const [isEditingProductNote, setIsEditingProductNote] = useState(false)
  const [productNoteLoading, setProductNoteLoading] = useState(false)

  useEffect(() => {
    if (productTypeNoteData?.data?.content) {
      setProductTypeNote(productTypeNoteData.data.content)
    } else {
      setProductTypeNote("")
    }
  }, [productTypeNoteData])

  const scrollToProductHistory = () => {
    const element = document.getElementById("product-history-section")
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const getStatusChangeDisplay = (entry: OrderHistoryEntry, prevEntry?: OrderHistoryEntry) => {
    if (!prevEntry) return `Order Created → ${entry.status}`
    return `${prevEntry.status} → ${entry.status}`
  }

  const getStatusBadge = (status: Order["status"]) => {
    switch (status) {
      case "NEW":
        return (
          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
            New
          </Badge>
        )
      case "DESIGNED":
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            Designed
          </Badge>
        )
      case "NEED_REPAIR":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
            Need Repair
          </Badge>
        )
      case "REPAIRED":
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Repaired
          </Badge>
        )
      case "CONFIRMED":
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Confirmed
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleOpenAllImages = () => {
    const imageUrls = extractImageUrls(productTypeNote)
    imageUrls.forEach((url) => {
      window.open(url, "_blank")
    })
  }

  const renderNoteContent = (content: string) => {
    if (!content) return null

    // Split content by URLs and render text and images
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = content.split(urlRegex)

    return (
      <div className="space-y-2">
        {parts.map((part, index) => {
          if (urlRegex.test(part)) {
            // Check if it's an image URL
            const isImage = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(part)
            if (isImage) {
              return (
                <div key={index} className="w-full">
                  <LazyImage
                    src={getCachedImageUrl(part) || part}
                    alt="Product type note image"
                    className="w-full h-auto object-contain rounded border border-gray-200 cursor-pointer"
                    onClick={() => window.open(part, "_blank")}
                    fallbackSrc="/placeholder.svg?height=200&width=300&text=Image"
                  />
                </div>
              )
            } else {
              // Regular URL - render as link
              return (
                <a
                  key={index}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline text-xs break-all"
                >
                  {part}
                </a>
              )
            }
          } else {
            // Regular text
            return part ? (
              <p key={index} className="text-xs text-gray-700 whitespace-pre-wrap">
                {part}
              </p>
            ) : null
          }
        })}
      </div>
    )
  }

  const handleSaveProductNote = async () => {
    if (!order.productType) return

    setProductNoteLoading(true)
    try {
      const response = await fetch(`/api/product-type-notes/${encodeURIComponent(order.productType)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: productTypeNote,
        }),
      })

      if (response.ok) {
        setIsEditingProductNote(false)
        refetchProductTypeNote()
      } else {
        console.error("Failed to save product type note")
      }
    } catch (error) {
      console.error("Error saving product type note:", error)
    } finally {
      setProductNoteLoading(false)
    }
  }

  const handleCancelEditProductNote = () => {
    setProductTypeNote(productTypeNoteData?.data?.content || "")
    setIsEditingProductNote(false)
  }

  return (
    <>
      {/* Order Comments */}
      <OrderComments itemId={order.itemId} />

      {/* Order Details */}
      <div className="border-b border-gray-200">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Order Details</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 text-xs">
            <div>
              <span className="text-gray-600">Designer:</span>{" "}
              <span className="font-medium">{order.designer || "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-600">Created:</span> <span className="font-medium">{order.date || "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>{" "}
              <span className="font-medium">{getStatusBadge(currentStatus)}</span>
            </div>
            <div>
              <span className="text-gray-600">Store:</span>{" "}
              {order.store ? (
                <a
                  href={`https://www.etsy.com/shop/${order.store}?search_query=${encodeURIComponent(order.productName || "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                >
                  {order.store}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="font-medium">N/A</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product Type Note */}
      {order.productType && (
        <div className="border-b border-gray-200">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-600" />
                <h3 className="text-sm font-semibold text-gray-900">Note for {order.productType}</h3>
              </div>
              <div className="flex gap-1">
                {!isEditingProductNote && extractImageUrls(productTypeNote).length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenAllImages}
                    className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                    title="Open all images in new tabs"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                {!isEditingProductNote ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingProductNote(true)}
                    className="h-7 w-7 p-0 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                    title="Edit product type note"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveProductNote}
                      disabled={productNoteLoading}
                      className="h-7 w-7 p-0 text-green-600 hover:bg-green-50 hover:text-green-700"
                      title="Save note"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEditProductNote}
                      disabled={productNoteLoading}
                      className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {productTypeNoteLoading ? (
              <div className="text-xs text-gray-500">Loading note...</div>
            ) : productTypeNoteError ? (
              <div className="text-xs text-red-600">Error loading note</div>
            ) : isEditingProductNote ? (
              <div className="space-y-3">
                <Textarea
                  value={productTypeNote}
                  onChange={(e) => setProductTypeNote(e.target.value)}
                  placeholder="Add notes for this product type. You can include text and image URLs..."
                  rows={6}
                  className="text-xs border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                />
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Lightbulb className="h-3 w-3" />
                  <span>Tip: Paste image URLs (jpg, png, gif, webp) and they will be displayed automatically</span>
                </div>
              </div>
            ) : (
              <div className="min-h-[60px] bg-orange-50 rounded-md p-3 border border-orange-100">
                {productTypeNote ? (
                  renderNoteContent(productTypeNote)
                ) : (
                  <div className="text-xs text-gray-500 italic">
                    No notes available for this product type. Click Edit to add notes.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order History */}
      <div className="border-b border-gray-200">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Order History</h3>
          </div>

          {orderHistoryLoading ? (
            <div className="text-xs text-gray-500">Loading order history...</div>
          ) : orderHistoryError ? (
            <div className="text-xs text-red-600">Error loading order history: {orderHistoryError}</div>
          ) : orderHistoryData?.data?.history?.length ? (
            <div className="space-y-3">
              {orderHistoryData.data.history.map((entry, index) => {
                const prevEntry = orderHistoryData.data.history[index + 1]
                return (
                  <div key={entry.id} className="border-l-2 border-gray-200 pl-3 pb-3">
                    <div className="text-xs text-gray-600 mb-1">{formatDate(entry.createdAt)}</div>
                    <div className="text-xs font-medium text-gray-900 mb-1">
                      {getStatusChangeDisplay(entry, prevEntry)}
                      {entry.changeType && (
                        <Badge
                          variant="outline"
                          className={`ml-2 text-xs ${
                            entry.changeType === "design_error"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {entry.changeType === "design_error" ? "Design Error" : "Customer Change"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                      <User className="h-3 w-3" />
                      <span>
                        {entry.createdBy.name} ({entry.createdBy.role})
                      </span>
                    </div>
                    {entry.orderNote && (
                      <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded">"{entry.orderNote}"</div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-500">No order history available</div>
          )}
        </div>
      </div>

      {/* Product History */}
      {order.productType && (
        <div id="product-history-section">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <History className="h-4 w-4 text-purple-600" />
              <h3 className="text-sm font-semibold text-gray-900">{order.productType} - Need Repair History</h3>
            </div>

            {productHistoryLoading ? (
              <div className="text-xs text-gray-500">Loading product history...</div>
            ) : productHistoryError ? (
              <div className="text-xs text-red-600">Error loading product history: {productHistoryError}</div>
            ) : productHistoryData?.data?.orders?.length ? (
              <div className="space-y-2">
                <div className="text-xs text-gray-600 mb-3">
                  Orders that required NEED REPAIR for {order.productType} ({productHistoryData.data.totalRepairOrders}{" "}
                  total)
                </div>
                {productHistoryData.data.orders.map((entry) => (
                  <div key={entry.id} className="bg-gray-50 rounded p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-medium text-gray-900">Order #{entry.itemId}</div>
                      <div className="text-xs text-gray-600">{formatDate(entry.createdAt)}</div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-600">Designer:</span>
                      <span className="text-xs font-medium">{entry.designer}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          entry.changeType === "design_error"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {entry.changeType === "design_error" ? "Design Error" : "Customer Change"}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-700">
                      <span className="font-medium">Issue:</span> "{entry.issueDescription}"
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">No repair history found for this product type</div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
