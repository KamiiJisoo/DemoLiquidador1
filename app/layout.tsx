import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Control de Horas Extras',
  description: 'Sistema de control de horas extras para bomberos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Registrar acceso al cargar la página
  if (typeof window !== 'undefined') {
    fetch('/api/registrar-acceso', { method: 'POST' });
  }

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-[var(--background)] flex flex-col no-horizontal-scroll`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {/* Header fijo - Ahora cubre completamente el ancho */}
          <header className="bg-[var(--primary)] text-white py-4 shadow-md sticky top-0 z-50 w-full">
            <div className="w-full max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex flex-col sm:flex-row items-center bg-white rounded-lg px-3 py-2 shadow-sm">
                  <img 
                    src="/LogoFinal.png" 
                    alt="Logo Bomberos" 
                    className="h-16 sm:h-20 w-auto object-contain sm:mr-4 mb-2 sm:mb-0" 
                  />
                  <div className="flex flex-col items-center sm:items-start">
                    <span className="text-sm sm:text-lg font-bold text-gray-800 text-center sm:text-left leading-tight">
                      Cálculo de recargos y Horas Extras
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Espacio para futuras acciones del header */}
              </div>
            </div>
          </header>
          {/* Contenido principal */}
          <main className="flex-1 w-full">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
          {/* Footer institucional - Ahora cubre completamente el ancho */}
          <footer className="bg-gray-200 text-center py-4 mt-8 text-gray-600 text-xs sm:text-sm w-full">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <p className="break-words">
                © 2025 U.A.E CUERPO OFICIAL DE BOMBEROS BOGOTA D.C. - Cálculo recargos y Horas Extras
              </p>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  )
}
