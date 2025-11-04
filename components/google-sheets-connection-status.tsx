"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useApi } from "@/hooks/use-api"
import { useState } from "react"
import { Loader2, CheckCircle, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react"

interface GoogleSheetsTokenData {
  clientId: string
  clientSecret: string
  accessToken: string | null
  refreshToken: string | null
  expiresAt: string | null
  message?: string
}

interface GoogleSheetsTokenResponse {
  success: boolean
  data: GoogleSheetsTokenData
  error?: string
  message?: string
}

export function GoogleSheetsConnectionStatus() {
  const { data, loading, error, refetch } = useApi<GoogleSheetsTokenResponse>("/auth/google-sheets-token")
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [oauthError, setOauthError] = useState<string | null>(null)

  const handleReconnect = async () => {
    setIsReconnecting(true)
    setOauthError(null)

    try {
      // Get current token data for OAuth configuration
      if (!data?.data?.clientId || !data?.data?.clientSecret) {
        throw new Error("Google OAuth credentials not available")
      }

      // Create OAuth URL
      const redirectUri = `${window.location.origin}/api/auth/google-sheets-callback`
      const scope = "https://www.googleapis.com/auth/spreadsheets"
      const responseType = "code"
      const accessType = "offline"
      const prompt = "consent" // Force consent to get refresh token

      const oauthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
      oauthUrl.searchParams.set("client_id", data.data.clientId)
      oauthUrl.searchParams.set("redirect_uri", redirectUri)
      oauthUrl.searchParams.set("scope", scope)
      oauthUrl.searchParams.set("response_type", responseType)
      oauthUrl.searchParams.set("access_type", accessType)
      oauthUrl.searchParams.set("prompt", prompt)

      // Open OAuth popup
      const popup = window.open(
        oauthUrl.toString(),
        "google-oauth",
        "width=500,height=600,scrollbars=yes,resizable=yes",
      )

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site.")
      }

      // Listen for OAuth completion
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          setIsReconnecting(false)
          // Refresh the token data after OAuth
          refetch()
        }
      }, 1000)

      // Listen for messages from popup
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return

        if (event.data.type === "GOOGLE_OAUTH_SUCCESS") {
          popup.close()
          clearInterval(checkClosed)
          setIsReconnecting(false)
          refetch()
          window.removeEventListener("message", messageListener)
        } else if (event.data.type === "GOOGLE_OAUTH_ERROR") {
          popup.close()
          clearInterval(checkClosed)
          setIsReconnecting(false)
          setOauthError(event.data.error || "OAuth failed")
          window.removeEventListener("message", messageListener)
        }
      }

      window.addEventListener("message", messageListener)

      // Cleanup if popup is manually closed
      setTimeout(() => {
        if (!popup.closed) {
          popup.close()
          clearInterval(checkClosed)
          setIsReconnecting(false)
          window.removeEventListener("message", messageListener)
        }
      }, 300000) // 5 minute timeout
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : "Failed to start OAuth flow")
      setIsReconnecting(false)
    }
  }

  const getConnectionStatus = () => {
    if (loading) return { status: "loading", text: "Checking connection...", icon: Loader2, color: "gray" }
    if (error) return { status: "error", text: "Connection Error", icon: AlertTriangle, color: "red" }
    if (!data?.data?.accessToken)
      return { status: "disconnected", text: "Not Connected", icon: AlertTriangle, color: "yellow" }

    // Check if token is expired
    if (data.data.expiresAt) {
      const expiryDate = new Date(data.data.expiresAt)
      const now = new Date()
      const timeUntilExpiry = expiryDate.getTime() - now.getTime()

      if (timeUntilExpiry <= 0) {
        return { status: "expired", text: "Token Expired", icon: AlertTriangle, color: "red" }
      } else if (timeUntilExpiry < 3600000) {
        // Less than 1 hour
        return { status: "expiring", text: "Token Expiring Soon", icon: AlertTriangle, color: "yellow" }
      }
    }

    return { status: "connected", text: "Connected", icon: CheckCircle, color: "green" }
  }

  const getLastRefreshText = () => {
    if (!data?.data?.expiresAt) return "Never"

    const expiryDate = new Date(data.data.expiresAt)
    const now = new Date()
    const diffMs = now.getTime() - (expiryDate.getTime() - 3600000) // Assuming 1 hour token life

    if (diffMs < 60000) return "Just now"
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)} minutes ago`
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)} hours ago`
    return `${Math.floor(diffMs / 86400000)} days ago`
  }

  const connectionStatus = getConnectionStatus()
  const StatusIcon = connectionStatus.icon

  return (
    <div className="space-y-4">
      {/* OAuth Error Alert */}
      {oauthError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            <div className="font-medium mb-1">OAuth Error</div>
            <div className="text-sm">{oauthError}</div>
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Status Card */}
      <Card className="shadow-md border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
            <div
              className={`w-3 h-3 rounded-full mr-3 ${
                connectionStatus.color === "green"
                  ? "bg-green-500"
                  : connectionStatus.color === "yellow"
                    ? "bg-yellow-500"
                    : connectionStatus.color === "red"
                      ? "bg-red-500"
                      : "bg-gray-400"
              }`}
            ></div>
            Google Sheets System Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <StatusIcon
                  className={`h-5 w-5 ${
                    connectionStatus.color === "green"
                      ? "text-green-600"
                      : connectionStatus.color === "yellow"
                        ? "text-yellow-600"
                        : connectionStatus.color === "red"
                          ? "text-red-600"
                          : "text-gray-400"
                  } ${connectionStatus.status === "loading" ? "animate-spin" : ""}`}
                />
                <Badge
                  variant={
                    connectionStatus.color === "green"
                      ? "default"
                      : connectionStatus.color === "yellow"
                        ? "secondary"
                        : "destructive"
                  }
                  className={
                    connectionStatus.color === "green"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : connectionStatus.color === "yellow"
                        ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                        : "bg-red-100 text-red-800 border-red-200"
                  }
                >
                  {connectionStatus.text}
                </Badge>
              </div>

              {data?.data?.accessToken ? (
                <div>
                  <p className="text-sm text-gray-600">
                    Connected as <span className="font-medium">system-account@company.com</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Last Token Refresh: {getLastRefreshText()}</p>
                  {data.data.expiresAt && (
                    <p className="text-xs text-gray-500">
                      Token expires: {new Date(data.data.expiresAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600">
                    {data?.data?.message || "No Google Sheets connection configured"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Connect your Google account to enable sheet integration</p>
                </div>
              )}

              {error && <p className="text-sm text-red-600 mt-2">Error: {error}</p>}
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReconnect}
                disabled={isReconnecting || loading}
                className="bg-white hover:bg-gray-50"
              >
                {isReconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {data?.data?.accessToken ? "Reconnect" : "Connect"}
              </Button>

              {data?.data?.accessToken && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open("https://myaccount.google.com/permissions", "_blank")}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Additional Information */}
          {data?.data?.accessToken && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Processing:</span>
                  <span className="ml-2 font-medium">Client-side</span>
                </div>
                <div>
                  <span className="text-gray-500">Permissions:</span>
                  <span className="ml-2 font-medium">Read & Write Sheets</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
