interface GoogleDriveClientOptions {
  accessToken: string
}

class GoogleDriveClient {
  private accessToken: string
  private static fetchCache = new Map<string, Promise<Blob>>()
  private static blobCache = new Map<string, string>()

  constructor(options: GoogleDriveClientOptions) {
    this.accessToken = options.accessToken
  }

  // Extract file ID from Google Drive URL
  private extractFileId(url: string): string | null {
    if (!url.includes("drive.google.com")) return null

    // Handle different Google Drive URL formats
    // https://drive.google.com/file/d/FILE_ID/view
    // https://drive.google.com/open?id=FILE_ID
    // https://drive.google.com/uc?id=FILE_ID

    const patterns = [/\/file\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/, /\/d\/([a-zA-Z0-9_-]+)/]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }

    return null
  }

  // Fetch file content as blob
  async fetchFile(url: string): Promise<Blob> {
    const fileId = this.extractFileId(url)
    if (!fileId) {
      throw new Error("Invalid Google Drive URL")
    }

    const cacheKey = fileId
    if (GoogleDriveClient.fetchCache.has(cacheKey)) {
      console.log("[GoogleDriveClient] Using in-flight request for:", fileId)
      return GoogleDriveClient.fetchCache.get(cacheKey)!
    }

    console.log("[GoogleDriveClient] Fetching file:", fileId)

    // Use Google Drive API v3 to get file content
    const apiUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`

    const fetchPromise = fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text()
          console.error("[GoogleDriveClient] Error fetching file:", errorText)
          throw new Error(`Failed to fetch file: HTTP ${response.status}`)
        }

        const blob = await response.blob()
        console.log("[GoogleDriveClient] File fetched successfully, size:", blob.size)

        GoogleDriveClient.fetchCache.delete(cacheKey)

        return blob
      })
      .catch((error) => {
        GoogleDriveClient.fetchCache.delete(cacheKey)
        throw error
      })

    GoogleDriveClient.fetchCache.set(cacheKey, fetchPromise)
    return fetchPromise
  }

  // Fetch file and return as object URL for display
  async fetchFileAsObjectUrl(url: string): Promise<string> {
    const fileId = this.extractFileId(url)
    if (!fileId) {
      throw new Error("Invalid Google Drive URL")
    }

    if (GoogleDriveClient.blobCache.has(fileId)) {
      console.log("[GoogleDriveClient] Using cached blob URL for:", fileId)
      return GoogleDriveClient.blobCache.get(fileId)!
    }

    const blob = await this.fetchFile(url)
    const objectUrl = URL.createObjectURL(blob)

    GoogleDriveClient.blobCache.set(fileId, objectUrl)

    return objectUrl
  }

  static clearCache() {
    // Revoke all blob URLs before clearing
    GoogleDriveClient.blobCache.forEach((blobUrl) => {
      URL.revokeObjectURL(blobUrl)
    })
    GoogleDriveClient.blobCache.clear()
    GoogleDriveClient.fetchCache.clear()
  }
}

export { GoogleDriveClient }
