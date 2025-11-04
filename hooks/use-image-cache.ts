"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { Order } from "@/types/order"
import { getImageUrl } from "@/utils/image-utils"

export function useImageCache() {
  const [imageCache, setImageCache] = useState<Map<string, string>>(new Map())
  const blobUrlsRef = useRef<Set<string>>(new Set())

  const preloadOrderImages = useCallback(
    async (orderToPreload: Order) => {
      const mockupUrl = getImageUrl(orderToPreload.mockup, "mockup")

      if (!mockupUrl) return

      // Only preload if it's a slow-loading URL
      if (!mockupUrl.startsWith("https://go.pamoteam.top/")) return

      console.log(`[v0] Preloading mockup image for next order:`, orderToPreload.itemId)

      if (!imageCache.has(mockupUrl)) {
        try {
          const response = await fetch(mockupUrl)
          if (response.ok) {
            const blob = await response.blob()
            const objectUrl = URL.createObjectURL(blob)

            blobUrlsRef.current.add(objectUrl)

            setImageCache((prev) => new Map(prev).set(mockupUrl, objectUrl))
            console.log(`[v0] Cached mockup image for order ${orderToPreload.itemId} ${mockupUrl} ${objectUrl}`)
          }
        } catch (error) {
          console.log(`[v0] Failed to cache mockup image for order ${orderToPreload.itemId}:`, error)
        }
      }
    },
    [imageCache],
  )

  const getCachedImageUrl = useCallback(
    (originalUrl: string | null): string | null => {
      if (!originalUrl) return null

      const cachedUrl = imageCache.get(originalUrl) || null

      if (originalUrl.startsWith("https://go.pamoteam.top")) {
        /*if (cachedUrl) {
          console.log("ImageCache hit:", { originalUrl, cachedUrl })
        } else {
          console.log("ImageCache miss:", { originalUrl })
        }*/
      }

      return cachedUrl || originalUrl
    },
    [imageCache],
  )

  useEffect(() => {
    return () => {
      // Cleanup all blob URLs when component unmounts
      blobUrlsRef.current.forEach((blobUrl) => {
        URL.revokeObjectURL(blobUrl)
      })
      blobUrlsRef.current.clear()
    }
  }, []) // Removed imageCache dependency to prevent premature cleanup

  return {
    imageCache,
    preloadOrderImages,
    getCachedImageUrl,
  }
}
