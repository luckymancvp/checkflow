"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { logError } from "@/lib/sentry"

interface ApiResponse<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useApi<T>(endpoint: string, options?: { enabled?: boolean }): ApiResponse<T> {
  const enabled = options?.enabled ?? true
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const { user, signOut, getToken } = useAuth() // Get getToken from context

  const fetchData = useCallback(async () => {
    const token = getToken()
    if (!user || !token) {
      // Ensure user is authenticated and token exists
      setError("User not authenticated or token missing.")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api${endpoint}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Send token in Authorization header
        },
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // If token is invalid or unauthorized, sign out the user
          logError(new Error(`API Unauthorized/Forbidden: ${endpoint}`), { status: response.status })
          await signOut()
          setError("Your session has expired. Please log in again.")
          return
        }

        const result = await response.json().catch(() => ({}))
        throw new Error(result.message || `HTTP ${response.status}`)
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setError(errorMessage)
      logError(err as Error, { context: `useApi ${endpoint}` })
    } finally {
      setLoading(false)
    }
  }, [endpoint, user, signOut, getToken]) // Add getToken to dependencies

  useEffect(() => {
    if (enabled && user) {
      // Only fetch if enabled and user is present
      fetchData()
    } else {
      setLoading(false)
    }
  }, [fetchData, user, enabled])

  return { data, loading, error, refetch: fetchData }
}

// Hook for making POST/PUT/DELETE requests
export function useApiMutation() {
  const { user, signOut, getToken } = useAuth() // Get getToken from context
  const [loading, setLoading] = useState(false)

  const mutate = useCallback(
    async (endpoint: string, options: { method?: "POST" | "PUT" | "DELETE"; body?: any } = {}): Promise<any> => {
      const token = getToken()
      if (!user || !token) {
        // Ensure user is authenticated and token exists
        throw new Error("User not authenticated or token missing.")
      }

      setLoading(true)
      try {
        const response = await fetch(`/api${endpoint}`, {
          method: options.method || "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Send token in Authorization header
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        })

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            await signOut()
            throw new Error("Your session has expired. Please log in again.")
          }

          const result = await response.json().catch(() => ({}))
          throw new Error(result.message || `HTTP ${response.status}`)
        }

        return await response.json()
      } finally {
        setLoading(false)
      }
    },
    [user, signOut, getToken], // Add getToken to dependencies
  )

  return { mutate, loading }
}
