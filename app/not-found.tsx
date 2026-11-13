import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarCheck2, Home, MessageCircle, SearchX } from 'lucide-react'
import { Encabezado, FondoClinica, PieClinica, TEAL, Tarjeta, enlaceWhatsApp } from './_components/Marca'
import { fuenteMarca } from './_components/fuente'

export const metadata: Metadata = {
  title: 'Página no encontrada · Clínica Dignidad',
}

export default function NoEncontrada() {
  return (
    <div className={fuenteMarca.className}>
      <FondoClinica>
        <Tarjeta>
          <Encabezado
            titulo="No encontramos esta página"
            bajada="El enlace puede estar incompleto, mal escrito o ya no estar disponible."
            icono={<SearchX className="h-6 w-6 text-[#FDB92B]" />}
          />

          <div className="rounded-[20px] border border-[#E3EAF2] bg-white p-4">
            <p className="text-[13px] font-black text-[#071B3A]">¿Venías a confirmar o cambiar tu hora?</p>
            <p className="mt-1 text-[12.5px] font-semibold leading-relaxed text-slate-500">
              Vuelve a abrir el enlace desde el mensaje de WhatsApp que te enviamos, sin cambiarle nada. Si no funciona, escríbenos y lo revisamos.
            </p>
          </div>

          <div className="mt-4 grid gap-2.5">
            <Link href="/agendar"
              className="flex items-center justify-center gap-2 rounded-[18px] px-5 py-3.5 text-[14px] font-black text-white shadow-[0_12px_28px_-18px_rgba(10,155,184,0.9)] transition hover:brightness-95"
              style={{ backgroundColor: TEAL }}>
              <CalendarCheck2 className="h-5 w-5" /> Agendar evaluación
            </Link>
            <a href={enlaceWhatsApp('Hola, tuve un problema con un enlace de Clínica Dignidad')} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-[18px] bg-[#25D366] px-5 py-3.5 text-[14px] font-black text-white transition hover:brightness-95">
              <MessageCircle className="h-5 w-5" /> Escribir por WhatsApp
            </a>
            <Link href="/"
              className="flex items-center justify-center gap-2 rounded-[18px] border border-[#E3EAF2] bg-white px-5 py-3 text-[13px] font-black text-[#071B3A] transition hover:border-[#0A9BB8]/40">
              <Home className="h-4 w-4" /> Ir al inicio
            </Link>
          </div>

          <PieClinica />
        </Tarjeta>
      </FondoClinica>
    </div>
  )
}
