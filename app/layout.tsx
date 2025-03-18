import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { DebugStoreProvider } from "@/app/lib/debug-store"
import { ConnectionStoreProvider } from "@/app/lib/connection-store"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "VyOS Dashboard",
  description: "A modern dashboard for VyOS routers",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <DebugStoreProvider>
          <ConnectionStoreProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              {children}
              <Toaster />
            </ThemeProvider>
          </ConnectionStoreProvider>
        </DebugStoreProvider>
      </body>
    </html>
  )
}
