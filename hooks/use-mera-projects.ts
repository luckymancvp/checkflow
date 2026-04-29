"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { logError } from "@/lib/sentry"
import type { MeraProject } from "@/types/mera-order"

export function useMeraProjects() {
  const [projects, setProjects] = useState<MeraProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, signOut, getToken } = useAuth()

  const fetchProjects = useCallback(async () => {
    const token = getToken()
    if (!user || !token) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const res = await fetch("/api/mera/projects", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          await signOut()
          setError("Your session has expired. Please log in again.")
          return
        }
        const result = await res.json().catch(() => ({}))
        throw new Error(result.error || `HTTP ${res.status}`)
      }

      const data = await res.json()
      setProjects(data.projects ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load projects"
      setError(message)
      logError(err as Error, { context: "useMeraProjects" })
    } finally {
      setLoading(false)
    }
  }, [user, signOut, getToken])

  useEffect(() => {
    if (user) fetchProjects()
    else setLoading(false)
  }, [fetchProjects, user])

  return { projects, loading, error, refetch: fetchProjects }
}
