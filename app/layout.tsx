import type { Metadata } from 'next'
import './globals.css'
import { colors } from '@/lib/ui/theme'

export const metadata: Metadata = {
  title: 'Resume Editor',
  description: 'AI-assisted LaTeX resume editor',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased" style={{ backgroundColor: colors.bg, color: colors.bodyText }}>
        {children}
      </body>
    </html>
  )
}
