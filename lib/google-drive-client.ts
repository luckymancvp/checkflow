interface GoogleDriveClientOptions {
  accessToken: string
}

interface DriveFileInfo {
  id: string
  name: string
  mimeType: string
}

class GoogleDriveClient {
  private accessToken: string
  private static fetchCache = new Map<string, Promise<Blob>>()
  private static blobCache = new Map<string, string>()
  private static folderListCache = new Map<string, Promise<DriveFileInfo[]>>()

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

  // Extract folder ID from Google Drive folder URL
  // https://drive.google.com/drive/folders/FOLDER_ID
  // https://drive.google.com/drive/u/0/folders/FOLDER_ID
  static extractFolderId(url: string): string | null {
    if (!url.includes("drive.google.com")) return null
    const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/)
    return match ? match[1] : null
  }

  static isFolderUrl(url: string): boolean {
    return GoogleDriveClient.extractFolderId(url) !== null
  }

  // List image files inside a Drive folder
  async listFolderFiles(folderUrl: string): Promise<DriveFileInfo[]> {
    const folderId = GoogleDriveClient.extractFolderId(folderUrl)
    if (!folderId) {
      throw new Error("Invalid Google Drive folder URL")
    }

    if (GoogleDriveClient.folderListCache.has(folderId)) {
      return GoogleDriveClient.folderListCache.get(folderId)!
    }

    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`)
    const fields = encodeURIComponent("files(id,name,mimeType)")
    const apiUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=name&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true`

    const listPromise = fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text()
          console.error("[GoogleDriveClient] Error listing folder:", errorText)
          GoogleDriveClient.folderListCache.delete(folderId)
          throw new Error(`Failed to list folder: HTTP ${response.status}`)
        }
        const data = await response.json()
        const files: DriveFileInfo[] = (data.files || []).filter((f: DriveFileInfo) =>
          f.mimeType?.startsWith("image/"),
        )
        console.log(`[GoogleDriveClient] Folder ${folderId} contains ${files.length} image file(s)`)
        return files
      })
      .catch((error) => {
        GoogleDriveClient.folderListCache.delete(folderId)
        throw error
      })

    GoogleDriveClient.folderListCache.set(folderId, listPromise)
    return listPromise
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

  static clearFileCache(url: string) {
    const patterns = [/\/file\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/, /\/d\/([a-zA-Z0-9_-]+)/]
    let fileId: string | null = null
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match?.[1]) { fileId = match[1]; break }
    }
    if (!fileId) return
    const blobUrl = GoogleDriveClient.blobCache.get(fileId)
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    GoogleDriveClient.blobCache.delete(fileId)
    GoogleDriveClient.fetchCache.delete(fileId)
  }
}

export { GoogleDriveClient }
export type { DriveFileInfo }
