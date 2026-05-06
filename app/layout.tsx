import './globals.css'
import { AuthProvider } from './context/AuthContext'

export const metadata = {
  title: 'HandyDad AI',
  description: 'Your expert guide for home repairs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}