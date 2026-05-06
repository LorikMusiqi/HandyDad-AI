import './globals.css'
import { AuthProvider } from './context/AuthContext'
import { ThemeScript } from './components/ThemeScript'

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <div className="register-marks" aria-hidden="true">
          <span /><span /><span /><span />
        </div>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
