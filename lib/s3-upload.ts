import AWS from "aws-sdk"

// S3 Configuration for Wasabi
const s3Config = {
  correctClockSkew: true,
  endpoint: "https://s3.us-west-1.wasabisys.com",
  accessKeyId: "78JWDK0I04XDN9UPEPOO",
  secretAccessKey: "2kzyNzjmAYNzDyiq065Xm1ous7rlMEEBBvSy4SSB",
  region: "us-west-1",
}

const BUCKET_NAME = "storevp"

function getContentType(fileName: string): string {
  const extension = fileName.toLowerCase().split(".").pop()
  switch (extension) {
    case "png":
      return "image/png"
    case "jpg":
    case "jpeg":
      return "image/jpeg"
    case "gif":
      return "image/gif"
    case "webp":
      return "image/webp"
    default:
      return "application/octet-stream"
  }
}

function generateFilePath(fileName: string): string {
  const date = new Date()
  const year = date.getFullYear().toString().substr(-2)
  const month = ("0" + (date.getMonth() + 1)).slice(-2)
  const day = ("0" + date.getDate()).slice(-2)
  const timestamp = Date.now()

  const folder = `stockpilot/${year}-${month}/${day}`
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
  const uniqueFileName = `${timestamp}_${cleanFileName}`

  return `${folder}/${uniqueFileName}`
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export async function uploadImageToS3(file: File, onProgress?: (progress: UploadProgress) => void): Promise<string> {
  const s3 = new AWS.S3(s3Config)
  const filePath = generateFilePath(file.name)

  return new Promise((resolve, reject) => {
    const uploadRequest = new AWS.S3.ManagedUpload({
      params: {
        Bucket: BUCKET_NAME,
        Key: filePath,
        Body: file,
        ACL: "public-read",
        ContentType: getContentType(file.name),
      },
      service: s3,
    })

    uploadRequest.on("httpUploadProgress", (event) => {
      if (onProgress && event.total) {
        const percentage = Math.floor((event.loaded * 100) / event.total)
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage,
        })
      }
    })

    uploadRequest.send((err) => {
      if (err) {
        console.error("[S3 Upload] Error:", err)
        reject(err)
      } else {
        const imageUrl = `https://s3.us-west-1.wasabisys.com/${BUCKET_NAME}/${filePath}`
        resolve(imageUrl)
      }
    })
  })
}

export function isImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const path = urlObj.pathname.toLowerCase()
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(path)
  } catch {
    return false
  }
}

export function extractImageUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const urls = text.match(urlRegex) || []
  return urls.filter(isImageUrl)
}
