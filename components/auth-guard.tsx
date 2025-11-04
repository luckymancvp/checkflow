"use client"

import type React from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, checkAuth } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Check authentication when component mounts
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    // If authentication is not loading and there's no user, redirect to login
    if (!loading && !user) {
      const isProduction = process.env.NODE_ENV === "production"
      const loginPath = isProduction ? "/login" : "/login_dev"
      router.push(loginPath)
    }
  }, [user, loading, router])

  // Show a loading spinner while authentication status is being determined
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-pink-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    )
  }

  // If user exists and not loading, render the children (protected content)
  return <>{children}</>
}
