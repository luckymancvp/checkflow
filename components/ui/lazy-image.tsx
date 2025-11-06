"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { googleSheetsClient } from "@/lib/google-sheets-client"
import { GoogleDriveClient } from "@/lib/google-drive-client"

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  fallbackSrc?: string
  placeholder?: string
  onLoad?: () => void
  onError?: () => void
  onClick?: () => void
}

export function LazyImage({
  src,
  alt,
  className,
  fallbackSrc = "/placeholder.svg?height=48&width=48&text=Image",
  placeholder = "/placeholder.svg?height=48&width=48&text=Loading",
  onLoad,
  onError,
  onClick,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [resolvedSrc, setResolvedSrc] = useState<string>(src)
  const [isResolvingSrc, setIsResolvingSrc] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const fetchInitiatedRef = useRef<boolean>(false)

  const isGoogleDriveUrl = (url: string): boolean => {
    return url.includes("drive.google.com")
  }

  useEffect(() => {
    if (!isInView || !isGoogleDriveUrl(src) || fetchInitiatedRef.current) return

    const fetchDriveFile = async () => {
      fetchInitiatedRef.current = true
      setIsResolvingSrc(true)

      console.log("[v0] LazyImage: Starting fetch for", src)

      try {
        const accessToken = await googleSheetsClient.getValidAccessToken()
        const driveClient = new GoogleDriveClient({ accessToken })
        const objectUrl = await driveClient.fetchFileAsObjectUrl(src)

        setResolvedSrc(objectUrl)
        console.log("[v0] LazyImage: Successfully resolved", src)
      } catch (error) {
        console.error("[LazyImage] Failed to fetch Google Drive file:", error)
        setHasError(true)
      } finally {
        setIsResolvingSrc(false)
      }
    }

    fetchDriveFile()
  }, [isInView, src])

  useEffect(() => {
    fetchInitiatedRef.current = false
    setIsLoaded(false)
    setHasError(false)

    if (!isGoogleDriveUrl(src)) {
      setResolvedSrc(src)
    }
  }, [src])

  // This allows blob URLs to persist when modal closes and reopens

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 },
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)} onClick={onClick}>
      {!isInView ? (
        <img
          src={placeholder || "/placeholder.svg"}
          alt="Loading..."
          className="w-full h-full object-cover opacity-50"
        />
      ) : (
        <>
          {(!isLoaded || isResolvingSrc) && (
            <img
              src={placeholder || "/placeholder.svg"}
              alt="Loading..."
              className="absolute inset-0 w-full h-full object-cover opacity-50"
            />
          )}
          {!isResolvingSrc && (
            <img
              src={hasError ? fallbackSrc : resolvedSrc}
              alt={alt}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                isLoaded ? "opacity-100" : "opacity-0",
              )}
              onLoad={handleLoad}
              onError={handleError}
            />
          )}
        </>
      )}
    </div>
  )
}
