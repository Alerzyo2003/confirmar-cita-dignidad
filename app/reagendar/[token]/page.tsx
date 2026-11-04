import type { Metadata } from 'next'
import ReagendarClient from './ReagendarClient'

export const dynamic = 'force-dynamic'

// El token va en la URL: que no lo indexen ni se envíe como referencia a otros sitios
export const metadata: Metadata = {
  title: 'Reagendar hora | Clínica Dignidad',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function ReagendarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <ReagendarClient token={token} />
}
