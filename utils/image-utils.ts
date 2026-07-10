export const getImageUrl = (
  url: string | null | undefined,
  imageType: "design" | "mockup" | "other",
): string | null => {
  if (!url) return null
  // Return original URL - Google Drive links will be handled by the cache system
  return url
}

export const extractImageUrls = (content: string) => {
  if (!content) return []
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const urls = content.match(urlRegex) || []
  return urls.filter((url) => /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url))
}
