"use client"

import { useState, useCallback, useRef } from "react"
import type { Order } from "@/types/order"
import { getImageUrl } from "@/utils/image-utils"
import { googleSheetsClient } from "@/lib/google-sheets-client"
import { GoogleDriveClient } from "@/lib/google-drive-client"
import { resolveDesignUrls } from "@/utils/design-links"

export function useImageCache() {
  const [imageCache, setImageCache] = useState<Map<string, string>>(new Map())
  const blobUrlsRef = useRef<Set<string>>(new Set())

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
      // designLink can hold multiple URLs and/or folder links — expand to individual files
      const designUrls = await resolveDesignUrls(orderToPreload.designLink).catch((error) => {
        console.error("[useImageCache] Failed to resolve design links:", error)
        return [] as string[]
      })

      const imagesToPreload = [
        { url: mockupUrl, type: "mockup" },
        ...designUrls.map((url) => ({ url, type: "design" })),
      ]

      for (const { url, type } of imagesToPreload) {
        if (!url) continue
        if (!isGoogleDriveUrl(url)) continue

        console.log(`[v0] Preloading ${type} image for next order:`, orderToPreload.itemId)

        if (!imageCache.has(url)) {
          try {
            const objectUrl = await fetchGoogleDriveFile(url)

            blobUrlsRef.current.add(objectUrl)
            setImageCache((prev) => new Map(prev).set(url, objectUrl))
            console.log(`[v0] Cached ${type} image for order ${orderToPreload.itemId}`)
          } catch (error) {
            console.log(`[v0] Failed to cache ${type} image for order ${orderToPreload.itemId}:`, error)
          }
        }
      }
    },
    [imageCache],
  )

  const getCachedImageUrl = useCallback(
    (originalUrl: string | null | undefined): string | null => {
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

  // GoogleDriveClient manages the cache lifecycle, allowing reuse when modal reopens
  // Blob URLs will persist across modal open/close cycles

  return {
    imageCache,
    preloadOrderImages,
    getCachedImageUrl,
    fetchGoogleDriveFile, // Export for on-demand fetching
  }
}
