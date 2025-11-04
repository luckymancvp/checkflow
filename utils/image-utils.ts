export const getImageUrl = (url: string | null, imageType: "design" | "mockup" | "other"): string | null => {
  if (!url) return null

  if (url.includes("drive.google.com")) {
    return `https://go.pamoteam.top/ggdrive?url=${encodeURIComponent(url)}`
  }
  return url
}

export const extractImageUrls = (content: string) => {
  if (!content) return []
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const urls = content.match(urlRegex) || []
  return urls.filter((url) => /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url))
}
