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
            <div className="w-full max-w-7xl mx-auto flex items-center justify-center px-4 sm:px-6 lg:px-8">
              {/* Contenedor blanco que incluye todos los elementos */}
              <div className="flex flex-col sm:flex-row items-center justify-between bg-white rounded-lg px-4 py-3 shadow-sm w-full max-w-5xl">
                
                {/* Logo App Liquidador - Izquierda */}
                <div className="flex items-center mb-2 sm:mb-0">
                  <img 
                    src="/Logo App Liquidador.jpg" 
                    alt="Logo App Liquidador1" 
                    className="h-20 sm:h-28 w-auto object-contain" 
                  />
                </div>
                
                {/* Título - Centro */}
                <div className="flex-1 flex justify-center mx-4">
                  <span className="text-sm sm:text-2xl font-bold text-gray-800 text-center leading-tight">
                    Simulador de Recargos y Horas Extras
                  </span>
                </div>
                
                {/* Logo Bomberos - Derecha */}
                <div className="flex items-center mt-2 sm:mt-0">
                  <img 
                    src="/LogoFinal.png" 
                    alt="Logo Bomberos" 
                    className="h-16 sm:h-20 w-auto object-contain" 
                  />
                </div>
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
                © 2025 U.A.E CUERPO OFICIAL DE BOMBEROS BOGOTA D.C. - Simulador de Recargos y Horas Extras
              </p>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  )
}
