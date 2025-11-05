"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { Order } from "@/types/order"
import { getImageUrl } from "@/utils/image-utils"
import { googleSheetsClient } from "@/lib/google-sheets-client"
import { GoogleDriveClient } from "@/lib/google-drive-client"

export function useImageCache(cacheKey?: number) {
  const [imageCache, setImageCache] = useState<Map<string, string>>(new Map())
  const blobUrlsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (cacheKey !== undefined) {
      console.log("[v0] Cache key changed, clearing image cache:", cacheKey)
      // Revoke old blob URLs
      blobUrlsRef.current.forEach((blobUrl) => {
        URL.revokeObjectURL(blobUrl)
      })
      blobUrlsRef.current.clear()
      setImageCache(new Map())
    }
  }, [cacheKey])

  const isGoogleDriveUrl = (url: string): boolean => {
    return url.includes("drive.google.com")
  }

  const fetchGoogleDriveFile = async (url: string): Promise<string> => {
    try {
      // Get access token from Google Sheets client (same token works for Drive API)
      const accessToken = await googleSheetsClient.getValidAccessToken()

      const driveClient = new GoogleDriveClient({ accessToken })
      const objectUrl = await driveClient.fetchFileAsObjectUrl(url)

      return objectUrl
    } catch (error) {
      console.error("[useImageCache] Failed to fetch Google Drive file:", error)
      throw error
    }
  }

  const preloadOrderImages = useCallback(
    async (orderToPreload: Order) => {
      const mockupUrl = getImageUrl(orderToPreload.mockup, "mockup")

      if (!mockupUrl) return

      if (!isGoogleDriveUrl(mockupUrl)) return

      console.log(`[v0] Preloading mockup image for next order:`, orderToPreload.itemId)

      if (!imageCache.has(mockupUrl)) {
        try {
          const objectUrl = await fetchGoogleDriveFile(mockupUrl)

          blobUrlsRef.current.add(objectUrl)
          setImageCache((prev) => new Map(prev).set(mockupUrl, objectUrl))
          console.log(`[v0] Cached mockup image for order ${orderToPreload.itemId}`)
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

      if (isGoogleDriveUrl(originalUrl)) {
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
  }, [])

  return {
    imageCache,
    preloadOrderImages,
    getCachedImageUrl,
    fetchGoogleDriveFile, // Export for on-demand fetching
  }
}
