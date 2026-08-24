"use client"

import { useCallback, useRef } from "react"
import type { Order } from "@/types/order"
import { FULL_SIZE, PREVIEW_SIZE, buildDriveImageUrl, isDriveUrl } from "@/lib/drive-image"
import { resolveDesignUrls } from "@/utils/design-links"

// Images are served by /api/drive-image with immutable cache headers, so "preloading"
// just means priming the browser HTTP cache — the <img> that renders later hits the
// same cache entry. Nothing is held in JS memory any more.

const MAX_PARALLEL_WARMS = 3

// Previews are small, so every image of an upcoming order gets one. Full renders are
// not: only the first design/mockup is fetched ahead, the rest arrive on demand (their
// preview is already cached, so the switch still feels instant).
const FULL_PREFETCH_PER_KIND = 1

export function useImageCache() {
  const warmedRef = useRef<Set<string>>(new Set())
  const queueRef = useRef<Array<() => Promise<void>>>([])
  const activeRef = useRef(0)

  const drain = useCallback(() => {
    while (activeRef.current < MAX_PARALLEL_WARMS && queueRef.current.length > 0) {
      const task = queueRef.current.shift()!
      activeRef.current += 1
      task().finally(() => {
        activeRef.current -= 1
        drain()
      })
    }
  }, [])

  const warm = useCallback(
    (url: string, size?: number) => {
      if (!isDriveUrl(url)) return

      const key = `${url}|${size ?? "full"}`
      if (warmedRef.current.has(key)) return
      warmedRef.current.add(key)

      queueRef.current.push(async () => {
        try {
          const proxyUrl = await buildDriveImageUrl(url, size ? { size } : undefined)
          if (!proxyUrl) return

          const response = await fetch(proxyUrl, { cache: "force-cache" })
          if (!response.ok) {
            warmedRef.current.delete(key)
            return
          }

          // Drain the body so the response actually lands in the HTTP cache.
          await response.arrayBuffer()
        } catch (error) {
          warmedRef.current.delete(key)
          console.error("[useImageCache] Failed to warm image:", url, error)
        }
      })

      drain()
    },
    [drain],
  )

  const preloadOrderImages = useCallback(
    async (orderToPreload: Order) => {
      // Both fields can hold several links and/or folder links — expand to single files.
      const [mockupUrls, designUrls] = await Promise.all([
        resolveDesignUrls(orderToPreload.mockup).catch(() => [] as string[]),
        resolveDesignUrls(orderToPreload.designLink).catch(() => [] as string[]),
      ])

      for (const url of [...mockupUrls, ...designUrls]) {
        warm(url, PREVIEW_SIZE)
      }

      for (const url of mockupUrls.slice(0, FULL_PREFETCH_PER_KIND)) {
        warm(url, FULL_SIZE)
      }
      for (const url of designUrls.slice(0, FULL_PREFETCH_PER_KIND)) {
        warm(url, FULL_SIZE)
      }
    },
    [warm],
  )

  const preloadOrders = useCallback(
    async (orders: Array<Order | undefined>) => {
      for (const order of orders) {
        if (order) await preloadOrderImages(order)
      }
    },
    [preloadOrderImages],
  )

  // Kept for call sites that used to swap in a blob URL; LazyImage now resolves Drive
  // links itself, so the original URL is what should be handed to it.
  const getCachedImageUrl = useCallback((originalUrl: string | null | undefined): string | null => {
    return originalUrl || null
  }, [])

  return {
    preloadOrderImages,
    preloadOrders,
    getCachedImageUrl,
  }
}
