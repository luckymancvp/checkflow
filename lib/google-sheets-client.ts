interface GoogleSheetsTokens {
  clientId: string
  clientSecret: string
  refreshToken: string
  accessToken?: string
  expiresAt?: number
}

interface GoogleSheetsApiResponse {
  success: boolean
  data?: any
  error?: string
}

interface QueuedRequest {
  id: string
  url: string
  options: RequestInit
  resolve: (value: any) => void
  reject: (error: Error) => void
  timestamp: number
}

class GoogleSheetsClient {
  private tokens: GoogleSheetsTokens | null = null
  private tokenPromise: Promise<GoogleSheetsTokens> | null = null
  private refreshPromise: Promise<string> | null = null

  private requestQueue: QueuedRequest[] = []
  private isProcessingQueue = false
  private requestCount = 0
  private requestWindowStart = Date.now()
  private readonly MAX_REQUESTS_PER_WINDOW = 58 // Conservative limit under 60 requests per minute
  private readonly WINDOW_DURATION = 60 * 1000 // 60 seconds (1 minute window)
  private readonly MIN_REQUEST_INTERVAL = 50 // 50ms between requests for smoother processing

  // Get tokens from server API (only once)
  private async fetchTokensFromServer(): Promise<GoogleSheetsTokens> {
    if (this.tokenPromise) {
      return this.tokenPromise
    }

    this.tokenPromise = (async () => {
      try {
        console.log("[GoogleSheetsClient] Fetching tokens from server...")
        const response = await fetch("/api/auth/google-sheets-token", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
          },
        })

        console.log("[GoogleSheetsClient] Token fetch response status:", response.status)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()
        console.log("[GoogleSheetsClient] Token fetch result:", { success: result.success, hasData: !!result.data })

        if (!result.success || !result.data) {
          throw new Error(result.error || "Failed to get tokens")
        }

        const tokens: GoogleSheetsTokens = {
          clientId: result.data.clientId,
          clientSecret: result.data.clientSecret,
          refreshToken: result.data.refreshToken,
        }

        this.tokens = tokens
        console.log("[GoogleSheetsClient] Tokens cached successfully")
        return tokens
      } catch (error) {
        console.error("[GoogleSheetsClient] Error fetching tokens:", error)
        this.tokenPromise = null
        throw error
      }
    })()

    return this.tokenPromise
  }

  // Exchange refresh token for access token with Google
  private async refreshAccessToken(tokens: GoogleSheetsTokens): Promise<string> {
    try {
      console.log("[GoogleSheetsClient] Refreshing access token...")
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: tokens.clientId,
          client_secret: tokens.clientSecret,
          refresh_token: tokens.refreshToken,
          grant_type: "refresh_token",
        }),
      })

      console.log("[GoogleSheetsClient] Token refresh response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[GoogleSheetsClient] Token refresh error response:", errorText)
        throw new Error(`Token refresh failed: HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("[GoogleSheetsClient] Token refresh success, expires in:", data.expires_in, "seconds")

      if (data.error) {
        throw new Error(`Token refresh error: ${data.error}`)
      }

      // Update tokens with new access token
      tokens.accessToken = data.access_token
      tokens.expiresAt = Date.now() + data.expires_in * 1000 - 60000 // 1 minute buffer

      return data.access_token
    } catch (error) {
      console.error("[GoogleSheetsClient] Failed to refresh access token:", error)
      throw new Error(`Failed to refresh access token: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Get valid access token (refresh if needed)
  private async getValidAccessToken(): Promise<string> {
    if (!this.tokens) {
      console.log("[GoogleSheetsClient] No tokens cached, fetching from server...")
      this.tokens = await this.fetchTokensFromServer()
    }

    // Check if we have a valid access token
    if (this.tokens.accessToken && this.tokens.expiresAt && Date.now() < this.tokens.expiresAt) {
      console.log("[GoogleSheetsClient] Using cached access token")
      return this.tokens.accessToken
    }

    if (this.refreshPromise) {
      console.log("[GoogleSheetsClient] Token refresh already in progress, waiting...")
      return this.refreshPromise
    }

    // Refresh access token
    console.log("[GoogleSheetsClient] Access token expired or missing, refreshing...")

    this.refreshPromise = this.refreshAccessToken(this.tokens).finally(() => {
      // Clear the promise when done (success or failure)
      this.refreshPromise = null
    })

    return this.refreshPromise
  }

  private async executeRequest(url: string, options: RequestInit = {}): Promise<any> {
    console.log("[GoogleSheetsClient] Executing API request to:", url)

    const accessToken = await this.getValidAccessToken()

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    console.log("[GoogleSheetsClient] API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[GoogleSheetsClient] API error response:", errorText)
      throw new Error(`Google Sheets API error: HTTP ${response.status} - ${errorText}`)
    }

    const responseData = await response.json()
    console.log("[GoogleSheetsClient] API response data keys:", Object.keys(responseData))
    return responseData
  }

  private async makeApiRequest(url: string, options: RequestInit = {}): Promise<any> {
    // For immediate requests (when queue is empty and we can make request)
    if (this.requestQueue.length === 0 && this.canMakeRequest()) {
      try {
        const result = await this.executeRequest(url, options)
        this.requestCount++
        return result
      } catch (error) {
        // If immediate request fails, fall back to queue
        console.log("[GoogleSheetsClient] Immediate request failed, adding to queue")
      }
    }

    // Add to queue and process
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url,
        options,
        resolve,
        reject,
        timestamp: Date.now(),
      }

      this.requestQueue.push(queuedRequest)
      console.log("[GoogleSheetsClient] Added request to queue, queue length:", this.requestQueue.length)

      // Start processing queue
      this.processRequestQueue()
    })
  }

  // Get spreadsheet metadata
  async getSpreadsheet(spreadsheetId: string): Promise<GoogleSheetsApiResponse> {
    try {
      console.log("[GoogleSheetsClient] Getting spreadsheet metadata for ID:", spreadsheetId)
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`
      const data = await this.makeApiRequest(url)

      return {
        success: true,
        data: data,
      }
    } catch (error) {
      console.error("[GoogleSheetsClient] Error getting spreadsheet:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Get sheet tabs/worksheets
  async getSheetTabs(spreadsheetId: string): Promise<GoogleSheetsApiResponse> {
    try {
      console.log("[GoogleSheetsClient] Getting sheet tabs for spreadsheet:", spreadsheetId)
      const result = await this.getSpreadsheet(spreadsheetId)

      if (!result.success || !result.data) {
        return result
      }

      const tabs =
        result.data.sheets?.map((sheet: any) => ({
          id: sheet.properties.sheetId,
          title: sheet.properties.title,
          index: sheet.properties.index,
          gridProperties: sheet.properties.gridProperties,
        })) || []

      console.log(
        "[GoogleSheetsClient] Found sheet tabs:",
        tabs.map((t: any) => t.title),
      )
      return {
        success: true,
        data: tabs,
      }
    } catch (error) {
      console.error("[GoogleSheetsClient] Error getting sheet tabs:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Get sheet data
  async getSheetData(spreadsheetId: string, range: string): Promise<GoogleSheetsApiResponse> {
    try {
      console.log("[GoogleSheetsClient] Getting sheet data for:")
      console.log("  - Spreadsheet ID:", spreadsheetId)
      console.log("  - Range:", range)

      const encodedRange = encodeURIComponent(range)
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`
      console.log("[GoogleSheetsClient] Full API URL:", url)

      const data = await this.makeApiRequest(url)

      console.log("[GoogleSheetsClient] Sheet data response:")
      console.log("  - Range:", data.range)
      console.log("  - Major dimension:", data.majorDimension)
      console.log("  - Values count:", data.values?.length || 0)
      if (data.values?.length > 0) {
        console.log("  - First row (headers):", data.values[0])
        console.log("  - Data rows count:", data.values.length - 1)
      }

      return {
        success: true,
        data: data,
      }
    } catch (error) {
      console.error("[GoogleSheetsClient] Error getting sheet data:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Update sheet data
  async updateSheetData(spreadsheetId: string, range: string, values: any[][]): Promise<GoogleSheetsApiResponse> {
    try {
      console.log("[GoogleSheetsClient] Updating sheet data for:")
      console.log("  - Spreadsheet ID:", spreadsheetId)
      console.log("  - Range:", range)
      console.log("  - Values count:", values.length)

      const encodedRange = encodeURIComponent(range)
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=RAW`
      console.log("[GoogleSheetsClient] Update API URL:", url)

      const data = await this.makeApiRequest(url, {
        method: "PUT",
        body: JSON.stringify({
          values: values,
        }),
      })

      console.log("[GoogleSheetsClient] Update response:", data)
      return {
        success: true,
        data: data,
      }
    } catch (error) {
      console.error("[GoogleSheetsClient] Error updating sheet data:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Batch update sheet data
  async batchUpdateSheetData(
    spreadsheetId: string,
    updates: Array<{ range: string; values: string[][] }>,
  ): Promise<GoogleSheetsApiResponse> {
    try {
      console.log("[GoogleSheetsClient] Batch updating sheet data for:")
      console.log("  - Spreadsheet ID:", spreadsheetId)
      console.log("  - Updates count:", updates.length)
      console.log(
        "  - Ranges:",
        updates.map((u) => u.range),
      )

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`
      console.log("[GoogleSheetsClient] Batch update API URL:", url)

      const requestBody = {
        valueInputOption: "RAW",
        data: updates.map((update) => ({
          range: update.range,
          values: update.values,
        })),
      }

      const data = await this.makeApiRequest(url, {
        method: "POST",
        body: JSON.stringify(requestBody),
      })

      console.log("[GoogleSheetsClient] Batch update response:", {
        updatedCells: data.totalUpdatedCells,
        updatedRows: data.totalUpdatedRows,
        updatedColumns: data.totalUpdatedColumns,
        updatedSheets: data.totalUpdatedSheets,
      })

      return {
        success: true,
        data: data,
      }
    } catch (error) {
      console.error("[GoogleSheetsClient] Error batch updating sheet data:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  private canMakeRequest(): boolean {
    const now = Date.now()

    if (now - this.requestWindowStart >= this.WINDOW_DURATION) {
      this.requestCount = 0
      this.requestWindowStart = now
      console.log("[GoogleSheetsClient] Rate limit window reset")
    }

    return this.requestCount < this.MAX_REQUESTS_PER_WINDOW
  }

  private async processRequestQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true
    console.log("[GoogleSheetsClient] Processing request queue with", this.requestQueue.length, "requests")

    while (this.requestQueue.length > 0) {
      if (!this.canMakeRequest()) {
        const waitTime = this.WINDOW_DURATION - (Date.now() - this.requestWindowStart)
        console.log("[GoogleSheetsClient] Rate limit reached, waiting", waitTime, "ms")
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        continue
      }

      const request = this.requestQueue.shift()!

      try {
        console.log("[GoogleSheetsClient] Processing queued request:", request.url)
        const result = await this.executeRequest(request.url, request.options)
        request.resolve(result)
        this.requestCount++

        // Add delay between requests to avoid hitting rate limits
        if (this.requestQueue.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.MIN_REQUEST_INTERVAL))
        }
      } catch (error) {
        console.error("[GoogleSheetsClient] Error processing queued request:", error)
        request.reject(error instanceof Error ? error : new Error("Unknown error"))
      }
    }

    this.isProcessingQueue = false
    console.log("[GoogleSheetsClient] Finished processing request queue")
  }

  getQueueStatus(): { queueLength: number; requestCount: number; canMakeRequest: boolean } {
    return {
      queueLength: this.requestQueue.length,
      requestCount: this.requestCount,
      canMakeRequest: this.canMakeRequest(),
    }
  }

  // Clear cached tokens (for logout or reconnection)
  clearTokens(): void {
    console.log("[GoogleSheetsClient] Clearing cached tokens and request queue")
    this.tokens = null
    this.tokenPromise = null
    this.refreshPromise = null

    // Clear pending requests
    this.requestQueue.forEach((request) => {
      request.reject(new Error("Client reset"))
    })
    this.requestQueue = []
    this.requestCount = 0
    this.requestWindowStart = Date.now()
  }
}

// Export singleton instance
export const googleSheetsClient = new GoogleSheetsClient()
