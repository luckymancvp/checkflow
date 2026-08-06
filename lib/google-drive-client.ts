interface GoogleDriveClientOptions {
  accessToken: string
}

interface DriveFileInfo {
  id: string
  name: string
  mimeType: string
}

// Image bytes are no longer downloaded here — they are served by /api/drive-image and
// cached by the browser (see lib/drive-image.ts). This client only resolves folders.
class GoogleDriveClient {
  private accessToken: string
  private static folderListCache = new Map<string, Promise<DriveFileInfo[]>>()

  constructor(options: GoogleDriveClientOptions) {
    this.accessToken = options.accessToken
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

  // Called on manual refresh so newly added files in a folder are picked up.
  static clearCache() {
    GoogleDriveClient.folderListCache.clear()
  }
}

export { GoogleDriveClient }
export type { DriveFileInfo }
