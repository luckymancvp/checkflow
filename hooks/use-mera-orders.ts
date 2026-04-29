"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { logError } from "@/lib/sentry"
import type { MeraListOrdersParams, MeraListOrdersResponse, MeraOrder } from "@/types/mera-order"

interface UseMeraOrdersResult {
  orders: MeraOrder[]
  total: number
  page: number
  page_size: number
  total_pages: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMeraOrders(params: MeraListOrdersParams): UseMeraOrdersResult {
  const [result, setResult] = useState<MeraListOrdersResponse>({
    orders: [],
    total: 0,
    page: 1,
    page_size: 50,
    total_pages: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, signOut, getToken } = useAuth()
  const paramsRef = useRef(params)
  paramsRef.current = params

  const fetchOrders = useCallback(async () => {
    const token = getToken()
    if (!user || !token) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const sp = new URLSearchParams()
      const p = paramsRef.current
      if (p.page) sp.set("page", String(p.page))
      if (p.page_size) sp.set("page_size", String(p.page_size))
      if (p.channel) sp.set("channel", p.channel)
      if (p.status) sp.set("status", p.status)
      if (p.statuses?.length) p.statuses.forEach((s) => sp.append("statuses", s))
      if (p.store) sp.set("store", p.store)
      if (p.provider) sp.set("provider", p.provider)
      if (p.designer) sp.set("designer", p.designer)
      if (p.project_id) sp.set("project_id", p.project_id)
      if (p.q) sp.set("q", p.q)
      if (p.include_items) sp.set("include_items", "true")

      const res = await fetch(`/api/mera/orders?${sp.toString()}`, {
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
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      const data: MeraListOrdersResponse = await res.json()
      setResult(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load orders"
      setError(message)
      logError(err as Error, { context: "useMeraOrders" })
    } finally {
      setLoading(false)
    }
  }, [user, signOut, getToken])

  useEffect(() => {
    if (user) fetchOrders()
    else setLoading(false)
  }, [
    fetchOrders,
    user,
    params.page,
    params.page_size,
    params.project_id,
    params.status,
    params.statuses?.join(","),
    params.store,
    params.channel,
    params.provider,
    params.designer,
    params.q,
    params.include_items,
  ])

  return { ...result, loading, error, refetch: fetchOrders }
}
