import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CalendarCheck2, CalendarDays, Clock, MapPin, MessageCircle, Phone } from 'lucide-react'
import { AMBER, DIRECCION, Encabezado, FondoClinica, MAPA_URL, PieClinica, TEAL, Tarjeta, WHATSAPP_CLINICA, WHATSAPP_CLINICA_LABEL, enlaceWhatsApp } from './_components/Marca'
import { fuenteMarca } from './_components/fuente'

export const metadata: Metadata = {
  title: 'Clínica Dignidad · Agenda tu hora',
  description: 'Agenda tu evaluación en el Centro Médico y Dental Dignidad, en La Pintana.',
}

export default function Inicio() {
  return (
    <div className={fuenteMarca.className}>
      <FondoClinica>
        <Tarjeta>
          <Encabezado
            titulo="Agenda tu hora"
            bajada="Bienvenido al Centro Médico y Dental Dignidad. Desde aquí puedes pedir tu hora de evaluación en pocos pasos."
            icono={<CalendarDays className="h-6 w-6 text-[#FDB92B]" />}
          />

          <Link
            href="/agendar"
            className="group relative flex items-center gap-4 overflow-hidden rounded-[22px] border border-[#E3EAF2] bg-white p-5 text-left shadow-[0_12px_30px_-22px_rgba(7,27,58,0.5)] transition hover:shadow-[0_18px_38px_-24px_rgba(7,27,58,0.6)]"
          >
            <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: TEAL }} />
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: TEAL }}>
              <CalendarCheck2 className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-black text-[#071B3A]">Agendar evaluación</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[12px] font-bold text-slate-500">
                <Clock size={12} style={{ color: AMBER }} /> Elige especialidad, profesional, día y hora
              </span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#0A9BB8]" />
          </Link>

          <a
            href={enlaceWhatsApp('Hola, quiero agendar una hora en Clínica Dignidad')}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-[18px] bg-[#25D366] px-5 py-3.5 text-[14px] font-black text-white shadow-[0_12px_28px_-18px_rgba(37,211,102,0.9)] transition hover:brightness-95"
          >
            <MessageCircle className="h-5 w-5" /> Prefiero escribir por WhatsApp
          </a>

          <div className="mt-5 rounded-[20px] border border-[#E3EAF2] bg-white p-4">
            <p className="text-[13px] font-black text-[#071B3A]">¿Ya tienes una hora?</p>
            <p className="mt-1 text-[12.5px] font-semibold leading-relaxed text-slate-500">
              Para confirmarla o cambiarla, abre el enlace que te enviamos por WhatsApp. Si no lo encuentras, escríbenos y te ayudamos.
            </p>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <a href={MAPA_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-[18px] border border-[#E3EAF2] bg-white p-3.5 transition hover:border-[#0A9BB8]/40">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0A9BB8]" />
              <span>
                <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Dirección</span>
                <span className="block text-[12.5px] font-bold text-[#071B3A]">{DIRECCION}</span>
              </span>
            </a>
            <a href={`tel:+${WHATSAPP_CLINICA}`}
              className="flex items-start gap-3 rounded-[18px] border border-[#E3EAF2] bg-white p-3.5 transition hover:border-[#0A9BB8]/40">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#0A9BB8]" />
              <span>
                <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Teléfono y WhatsApp</span>
                <span className="block text-[12.5px] font-bold text-[#071B3A]">{WHATSAPP_CLINICA_LABEL}</span>
              </span>
            </a>
          </div>

          <PieClinica />
        </Tarjeta>
      </FondoClinica>
    </div>
  )
}
