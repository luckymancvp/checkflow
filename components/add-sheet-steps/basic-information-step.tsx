"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, AlertTriangle, ExternalLink, Link, Lock } from "lucide-react"
import type { SheetConfiguration } from "../add-sheet-modal"
import { useApi } from "@/hooks/use-api"
import { googleSheetsClient } from "@/lib/google-sheets-client"

interface BasicInformationStepProps {
  configuration: SheetConfiguration
  updateConfiguration: (updates: Partial<SheetConfiguration>) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

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

export function BasicInformationStep({
  configuration,
  updateConfiguration,
  isLoading,
  setIsLoading,
}: BasicInformationStepProps) {
  const [urlError, setUrlError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const { data: tokenData, refetch: refetchTokens } = useApi<GoogleSheetsTokenResponse>("/auth/google-sheets-token")

  const extractSheetIdFromUrl = (url: string): string | null => {
    // Handle various Google Sheets URL formats
    const patterns = [
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      /\/spreadsheets\/u\/\d+\/d\/([a-zA-Z0-9-_]+)/,
      /^([a-zA-Z0-9-_]+)$/, // Direct sheet ID
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return match[1]
      }
    }

    return null
  }

  const handleUrlChange = async (url: string) => {
    updateConfiguration({ googleSheetUrl: url })
    setUrlError(null)

    if (url.trim()) {
      const sheetId = extractSheetIdFromUrl(url.trim())
      if (sheetId) {
        updateConfiguration({ googleSheetId: sheetId })

        // Auto-fill sheet name if empty and we have access token
        if (!configuration.name.trim() && tokenData?.data?.accessToken) {
          try {
            const response = await googleSheetsClient.getSpreadsheet(sheetId)

            if (response.success && response.data?.properties?.title) {
              updateConfiguration({ name: response.data.properties.title })
            }
          } catch (error) {
            // Silently fail - user can still enter name manually
            console.log("Could not auto-fill sheet name:", error)
          }
        }
      } else {
        setUrlError("Invalid Google Sheets URL format")
        updateConfiguration({ googleSheetId: "" })
      }
    } else {
      updateConfiguration({ googleSheetId: "" })
    }
  }

  const handleConnectGoogleAccount = async () => {
    setIsConnecting(true)
    setConnectionError(null)

    try {
      if (!tokenData?.data?.clientId || !tokenData?.data?.clientSecret) {
        throw new Error("Google OAuth credentials not available")
      }

      // Create OAuth URL
      const redirectUri = `${window.location.origin}/api/auth/google-sheets-callback`
      const scope = "https://www.googleapis.com/auth/spreadsheets"
      const responseType = "code"
      const accessType = "offline"
      const prompt = "consent"

      const oauthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
      oauthUrl.searchParams.set("client_id", tokenData.data.clientId)
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
          setIsConnecting(false)
          refetchTokens()
        }
      }, 1000)

      // Listen for messages from popup
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return

        if (event.data.type === "GOOGLE_OAUTH_SUCCESS") {
          popup.close()
          clearInterval(checkClosed)
          setIsConnecting(false)
          refetchTokens()
          window.removeEventListener("message", messageListener)
        } else if (event.data.type === "GOOGLE_OAUTH_ERROR") {
          popup.close()
          clearInterval(checkClosed)
          setIsConnecting(false)
          setConnectionError(event.data.error || "OAuth failed")
          window.removeEventListener("message", messageListener)
        }
      }

      window.addEventListener("message", messageListener)

      // Cleanup if popup is manually closed
      setTimeout(() => {
        if (!popup.closed) {
          popup.close()
          clearInterval(checkClosed)
          setIsConnecting(false)
          window.removeEventListener("message", messageListener)
        }
      }, 300000) // 5 minute timeout
    } catch (err) {
      setConnectionError(err instanceof Error ? err.message : "Failed to start OAuth flow")
      setIsConnecting(false)
    }
  }

  const isSystemConnected = tokenData?.data?.accessToken && !connectionError
  const hasValidUrl = configuration.googleSheetUrl.trim() && configuration.googleSheetId.trim() && !urlError

  return (
    <div className="space-y-6">
      {/* Connection Error Alert */}
      {connectionError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            <div className="font-medium mb-1">Connection Error</div>
            <div className="text-sm">{connectionError}</div>
          </AlertDescription>
        </Alert>
      )}

      {/* Basic Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-sm font-medium mr-3">
              1
            </div>
            Sheet Information
          </CardTitle>
          <CardDescription>Provide basic details about your Google Sheet integration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sheet-name">Sheet Name *</Label>
              <Input
                id="sheet-name"
                placeholder="e.g., Website 1 Orders"
                value={configuration.name}
                onChange={(e) => updateConfiguration({ name: e.target.value })}
                maxLength={100}
              />
              <p className="text-xs text-gray-500">{configuration.name.length}/100 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet-description">Description</Label>
              <Textarea
                id="sheet-description"
                placeholder="Optional description of this sheet's purpose"
                value={configuration.description}
                onChange={(e) => updateConfiguration({ description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="google-sheet-url">Google Sheet URL *</Label>
            {configuration.isEditing ? (
              // Read-only URL display for editing mode
              <div className="relative">
                <Input
                  id="google-sheet-url"
                  value={configuration.googleSheetUrl}
                  readOnly
                  className="bg-gray-50 text-gray-600 pr-10"
                />
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            ) : (
              // Editable URL input for new sheets
              <Input
                id="google-sheet-url"
                placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
                value={configuration.googleSheetUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                className={urlError ? "border-red-300" : ""}
              />
            )}

            {urlError && <p className="text-sm text-red-600">{urlError}</p>}

            {configuration.googleSheetId && !urlError && (
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="h-4 w-4 mr-2" />
                Sheet ID: {configuration.googleSheetId}
              </div>
            )}

            {configuration.isEditing ? (
              <p className="text-xs text-gray-500">
                Sheet URL is locked during editing. The sheet ID cannot be changed.
              </p>
            ) : (
              <p className="text-xs text-gray-500">Paste the full Google Sheets URL or just the sheet ID</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Access Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-sm font-medium mr-3">
              2
            </div>
            System Access
          </CardTitle>
          <CardDescription>Connect your Google account to enable sheet access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isSystemConnected ? "bg-green-500" : "bg-yellow-500"}`} />
              <div>
                <div className="font-medium">
                  {isSystemConnected ? "Google Account Connected" : "Google Account Required"}
                </div>
                <div className="text-sm text-gray-600">
                  {isSystemConnected
                    ? "System can access your Google Sheets"
                    : "Connect your Google account to read sheet data"}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {isSystemConnected && <Badge className="bg-green-100 text-green-800 border-green-200">Connected</Badge>}
              <Button
                variant={isSystemConnected ? "outline" : "default"}
                size="sm"
                onClick={handleConnectGoogleAccount}
                disabled={isConnecting}
                className={!isSystemConnected ? "bg-pink-600 hover:bg-pink-700" : ""}
              >
                {isConnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link className="h-4 w-4 mr-2" />}
                {isSystemConnected ? "Reconnect" : "Connect Account"}
              </Button>
            </div>
          </div>

          {hasValidUrl && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <ExternalLink className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-blue-900">Sheet Access Required</div>
                  <div className="text-blue-700 mt-1">
                    Make sure your Google Sheet is shared with the system account or set to "Anyone with the link can
                    view"
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-blue-600 hover:text-blue-800"
                    onClick={() => window.open(configuration.googleSheetUrl, "_blank")}
                  >
                    Open Sheet in New Tab →
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Summary */}
      <Card className="border-gray-200">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Step 1 Requirements</h4>
            <div className="space-y-1">
              <div className="flex items-center text-sm">
                {configuration.name.trim() ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 mr-2" />
                )}
                Sheet name provided
              </div>
              <div className="flex items-center text-sm">
                {hasValidUrl || (configuration.isEditing && configuration.googleSheetId) ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 mr-2" />
                )}
                {configuration.isEditing ? "Sheet ID available" : "Valid Google Sheets URL"}
              </div>
              <div className="flex items-center text-sm">
                {isSystemConnected ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 mr-2" />
                )}
                Google account connected
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
