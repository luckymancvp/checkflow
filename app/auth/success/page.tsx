"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { HOME_URL } from "@/lib/constants"

export default function AuthSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshUser } = useAuth()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Processing authentication...")

  useEffect(() => {
    const token = searchParams.get("token")

    if (token) {
      try {
        localStorage.setItem("auth-token", token)
        setMessage("Authentication successful! Redirecting to review page...")
        setStatus("success")
        // Refresh user data in context and then redirect
        refreshUser().then(() => {
          router.push(HOME_URL)
        })
      } catch (e) {
        console.error("Failed to store token in localStorage:", e)
        setMessage("Authentication failed: Could not store token securely.")
        setStatus("error")
        router.push("/login?error=localstorage_failed")
      }
    } else {
      setMessage("Authentication failed: No token received.")
      setStatus("error")
      router.push("/login?error=no_token_received")
    }
  }, [searchParams, router, refreshUser])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-pink-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white text-center">
        <CardHeader>
          {status === "loading" && <Loader2 className="h-12 w-12 animate-spin text-pink-600 mx-auto mb-4" />}
          {status === "success" && <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />}
          {status === "error" && <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />}
          <CardTitle className="text-2xl font-bold text-gray-900">
            {status === "success" ? "Success!" : status === "error" ? "Authentication Failed" : "Authenticating..."}
          </CardTitle>
          <CardDescription className="text-gray-600">{message}</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "error" && (
            <Alert className="border-red-200 bg-red-50 mt-4">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                If the issue persists, please try logging in again.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
