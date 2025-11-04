"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { HOME_URL } from "@/lib/constants"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace(HOME_URL)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}
