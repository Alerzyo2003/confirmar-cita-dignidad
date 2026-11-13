// Elementos de marca compartidos por la página de inicio y la 404 (mismos colores que /agendar)
import type { ReactNode } from 'react'

export const NAVY = '#071B3A'
export const AMBER = '#FDB92B'
export const TEAL = '#0A9BB8'
export const GREEN = '#6B9A2A'
export const MAGENTA = '#B01C48'

export const WHATSAPP_CLINICA = '56966467641'
export const WHATSAPP_CLINICA_LABEL = '+56 9 6646 7641'
export const DIRECCION = 'Av. Venancia Leiva 1871, La Pintana'
export const MAPA_URL = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Avenida Venancia Leiva 1871, La Pintana, Chile')

export const enlaceWhatsApp = (mensaje = 'Hola, quiero hacer una consulta en Clínica Dignidad') =>
  `https://wa.me/${WHATSAPP_CLINICA}?text=${encodeURIComponent(mensaje)}`

export function BrandBar() {
  return (
    <div className="flex h-[4px] w-full overflow-hidden" aria-hidden="true">
      {[GREEN, TEAL, AMBER, MAGENTA].map(color => <span key={color} className="flex-1" style={{ backgroundColor: color }} />)}
    </div>
  )
}

// Fondo con la imagen de la clínica, igual que en /agendar
export function FondoClinica({ children, imagen = '/fondo-agendar.png' }: { children: ReactNode; imagen?: string }) {
  return (
    <main className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#071B3A]">
      <div aria-hidden="true" className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url('${imagen}')` }} />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-[#071B3A]/[0.22]" />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0"
        style={{ background: 'linear-gradient(90deg, rgba(7,27,58,0.35) 0%, rgba(7,27,58,0.06) 50%, rgba(7,27,58,0.2) 100%)' }} />
      <div className="relative z-10 flex min-h-[100dvh] w-full items-center justify-center p-3 sm:p-5 lg:justify-end lg:p-7">
        {children}
      </div>
    </main>
  )
}

export function Tarjeta({ children }: { children: ReactNode }) {
  return (
    <section className="w-full max-w-[540px] overflow-hidden rounded-[28px] bg-[#F6F9FD] shadow-[0_28px_90px_-25px_rgba(7,27,58,0.65)] ring-1 ring-white/50">
      <BrandBar />
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  )
}

export function Encabezado({ titulo, bajada, icono }: { titulo: string; bajada?: ReactNode; icono?: ReactNode }) {
  return (
    <div className="mb-5 rounded-[22px] bg-[#071B3A] px-5 py-5 shadow-[0_16px_35px_-22px_rgba(7,27,58,0.8)]">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#22B3CF]">DIGNIDAD · Centro Médico y Dental</p>
          <h1 className="mt-1 text-[25px] font-black leading-tight tracking-tight text-white">{titulo}</h1>
          {bajada && <div className="mt-2 text-[13px] font-semibold leading-relaxed text-white/75">{bajada}</div>}
        </div>
        {icono && <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 sm:flex">{icono}</div>}
      </div>
    </div>
  )
}

export function PieClinica() {
  return (
    <p className="mt-5 text-center text-[11px] font-semibold text-slate-400">
      Centro Médico y Dental Dignidad SpA · Que sonreír sea costumbre
    </p>
  )
}
