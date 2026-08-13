import './globals.css'

export const metadata = {
  title: 'Confirmar Cita',
  description: 'Confirma tu cita médica',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}