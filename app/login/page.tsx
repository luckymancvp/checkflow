"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Zap, BarChart3, Users, Shield, AlertTriangle } from "lucide-react"
import { HOME_URL } from "@/lib/constants"

// Error messages mapping
const ERROR_MESSAGES = {
  google_oauth_error: "Google authentication failed",
  missing_oauth_params: "OAuth parameters missing",
  invalid_state: "Security validation failed",
  server_config: "Server configuration error",
  token_exchange_failed: "Failed to exchange authorization code",
  profile_fetch_failed: "Failed to fetch user profile from Google",
  database_connection: "Database connection error",
  database_query: "Database query failed",
  user_update_failed: "Failed to update user information",
  user_creation_failed: "Failed to create user account",
  token_generation_failed: "Failed to generate authentication token",
  unexpected_error: "An unexpected error occurred",
  oauth_initiation_failed: "Failed to start Google authentication",
}

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)

  useEffect(() => {
    if (user) {
      router.push(HOME_URL)
    }
  }, [user, router])

  useEffect(() => {
    // Check for error parameters in URL
    const errorType = searchParams.get("error")
    const errorMessage = searchParams.get("message")

    if (errorType) {
      const baseMessage = ERROR_MESSAGES[errorType as keyof typeof ERROR_MESSAGES] || "Authentication failed"
      const fullMessage = errorMessage ? `${baseMessage}: ${decodeURIComponent(errorMessage)}` : baseMessage
      setError(fullMessage)

      // Clear URL parameters after showing error
      const url = new URL(window.location.href)
      url.searchParams.delete("error")
      url.searchParams.delete("message")
      window.history.replaceState({}, "", url.toString())
    }
  }, [searchParams])

  const handleGoogleSignIn = async () => {
    try {
      setError(null)
      setIsSigningIn(true)
      // Redirect to server OAuth initiation endpoint
      window.location.href = "/api/auth/google"
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to initiate sign in"
      setError(errorMessage)
    } finally {
      setIsSigningIn(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-pink-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="text-center lg:text-left space-y-8">
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 text-white font-bold text-2xl shadow-lg">
              C
            </div>
            <div className="flex flex-col">
              <span className="text-4xl font-bold text-gray-900">CheckFlow</span>
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Zap className="h-4 w-4 text-pink-500" />
                Powered by PAMO
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
              Business Analytics & User Management Platform
            </h1>
            <p className="text-lg text-gray-600 max-w-lg">
              Streamline your business operations with comprehensive analytics, user management, and real-time insights.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-100">
              <BarChart3 className="h-8 w-8 text-pink-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Analytics</h3>
              <p className="text-sm text-gray-600">Real-time insights</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-100">
              <Users className="h-8 w-8 text-pink-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">User Management</h3>
              <p className="text-sm text-gray-600">Comprehensive control</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-100">
              <Shield className="h-8 w-8 text-pink-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Security</h3>
              <p className="text-sm text-gray-600">Enterprise-grade</p>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="flex justify-center">
          <div className="w-full max-w-md space-y-6">
            {/* Login Card */}
            <Card className="shadow-xl border-0 bg-white">
              <CardHeader className="text-center space-y-2">
                <CardTitle className="text-2xl font-bold text-gray-900">Welcome Back</CardTitle>
                <CardDescription className="text-gray-600">
                  Sign in to access your dashboard and manage your business analytics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700">
                      <div className="font-medium mb-1">Authentication Error</div>
                      <div className="text-sm">{error}</div>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm"
                >
                  {isSigningIn ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  {isSigningIn ? "Signing in..." : "Continue with Google"}
                </Button>

                <div className="text-center text-sm text-gray-500">
                  By signing in, you agree to our{" "}
                  <a href="#" className="text-pink-600 hover:text-pink-700 font-medium">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-pink-600 hover:text-pink-700 font-medium">
                    Privacy Policy
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
