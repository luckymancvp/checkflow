"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { usePathname } from "next/navigation"
import { logError, logInfo } from "@/lib/sentry"

// Define a type for our application's user, which comes from our 'users' table
interface AppUser {
  id: string
  email: string
  name: string
  role: string
  avatar_url?: string | null
  created_at?: string
  updated_at?: string
  last_login?: string
}

interface AuthContextType {
  user: AppUser | null
  loading: boolean
  signOut: () => Promise<void>
  checkAuth: () => Promise<void>
  refreshUser: () => Promise<void>
  getToken: () => string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem("app-user")
        return storedUser ? JSON.parse(storedUser) : null
      } catch (e) {
        console.error("Failed to parse stored user from localStorage", e)
        return null
      }
    }
    return null
  })
  const [loading, setLoading] = useState(false)
  const pathname = usePathname()

  // Define public routes that don't need authentication check
  const publicRoutes = ["/login", "/login_dev", "/auth/callback", "/auth/success"]
  const isPublicRoute = publicRoutes.includes(pathname)

  const getToken = useCallback(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("auth-token")
    }
    return null
  }, [])

  // Function to fetch current user from server API
  const fetchCurrentUser = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      if (typeof window !== "undefined") {
        localStorage.removeItem("app-user") // Clear user info if no token
      }
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch("/api/auth/me", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Send token in Authorization header
        },
      })

      if (response.ok) {
        const result = await response.json()
        setUser(result.user)
        if (typeof window !== "undefined") {
          localStorage.setItem("app-user", JSON.stringify(result.user)) // Store user info
        }
        logInfo("User authenticated", { userId: result.user.id })
      } else if (response.status === 401) {
        // User is not authenticated or token expired/invalid
        setUser(null)
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth-token") // Clear invalid token
          localStorage.removeItem("app-user") // Clear user info
        }
        logInfo("Authentication failed, token and user info cleared.")
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to fetch user")
      }
    } catch (error) {
      logError(error as Error, { context: "fetchCurrentUser" })
      setUser(null)
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth-token") // Clear token on fetch error
        localStorage.removeItem("app-user") // Clear user info on fetch error
      }
    } finally {
      setLoading(false)
    }
  }, [getToken])

  // Manual check auth function for protected routes
  const checkAuth = useCallback(async () => {
    if (!user && !loading) {
      await fetchCurrentUser()
    }
  }, [user, loading, fetchCurrentUser])

  // Refresh user data
  const refreshUser = useCallback(async () => {
    await fetchCurrentUser()
  }, [fetchCurrentUser])

  useEffect(() => {
    // Only check authentication for protected routes
    if (!isPublicRoute) {
      fetchCurrentUser()
    } else {
      // For public routes, set loading to false immediately
      setLoading(false)
    }
  }, [isPublicRoute, fetchCurrentUser])

  const signOut = async () => {
    try {
      setLoading(true)
      // Call logout API (server can log the event, but doesn't need to clear cookie)
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // No need to send token here, as it's a logout action
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to logout")
      }

      setUser(null)
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth-token") // Clear token from localStorage
        localStorage.removeItem("app-user") // Clear user info from localStorage
      }
      logInfo("User signed out")
    } catch (error) {
      logError(error as Error, { context: "signOut" })
      throw error
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signOut,
        checkAuth,
        refreshUser,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
