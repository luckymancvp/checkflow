"use client"

import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"
import { AuthGuard } from "@/components/auth-guard"
import { MainLayoutWrapper } from "@/components/main-layout-wrapper"
import { usePathname } from "next/navigation"

const inter = Inter({ subsets: ["latin"] })

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const publicRoutes = ["/login", "/login_dev", "/auth/callback", "/auth/success"]
  const isPublicRoute = publicRoutes.includes(pathname)

  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {isPublicRoute ? (
            children
          ) : (
            <AuthGuard>
              <MainLayoutWrapper>{children}</MainLayoutWrapper>
            </AuthGuard>
          )}
        </AuthProvider>
      </body>
    </html>
  )
}
