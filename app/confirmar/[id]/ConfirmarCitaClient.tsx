'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  CalendarDays,
  Loader2,
  MapPin,
  Clock3,
  HeartPulse
} from 'lucide-react'

export default function ConfirmarCitaClient({ cita }: { cita: any }) {
  const [confirmado, setConfirmado] = useState(
    cita.estado === 'confirmado_tel'
  )

  const [yaVencida] = useState(
    ['cancelada', 'atendido', 'no_asiste'].includes(cita.estado)
  )

  const [loading, setLoading] = useState(false)

  const fecha = new Date(cita.inicio).toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const hora = new Date(cita.inicio).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Santiago',
  })

  const confirmar = async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/confirmar-cita', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          citaId: cita.id,
        }),
      })

      if (!res.ok) throw new Error()

      setConfirmado(true)
    } catch {
      alert(
        'No pudimos confirmar tu cita, intenta de nuevo o contacta a la clínica.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8fbff]">

      {/* =========================
          FONDO - FACHADA CLÍNICA
      ========================== */}

      <div
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{
          backgroundImage: "url('/fachada-clinica.png')",
        }}
      />

      {/* Desenfoque para que el contenido destaque */}
      <div className="absolute inset-0 backdrop-blur-[3px]" />

      {/* Capa blanca */}
      <div className="absolute inset-0 bg-white/78" />

      {/* Gradiente Dignidad */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/75 to-[#dff1ff]/75" />

      {/* =========================
          DECORACIONES
      ========================== */}

      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#0b3b82]/10 blur-3xl" />

      <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#12a8e8]/15 blur-3xl" />

      {/* Línea decorativa superior */}
      <div className="absolute left-0 right-0 top-0 h-2 bg-gradient-to-r from-[#08295c] via-[#1478e8] to-[#20b8ed]" />

      {/* =========================
          CONTENIDO
      ========================== */}

      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">

        <div className="w-full max-w-[520px]">

          {/* Logo / encabezado */}

          <div className="mb-6 flex items-center justify-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#092b61] shadow-lg">
              <HeartPulse
                size={25}
                strokeWidth={2.3}
                className="text-white"
              />
            </div>

            <div className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#6f86a5]">
                Centro Médico y Dental
              </p>

              <p className="text-xl font-black tracking-tight text-[#092b61]">
                DIGNIDAD
              </p>
            </div>

          </div>

          {/* =========================
              TARJETA PRINCIPAL
          ========================== */}

          <div className="overflow-hidden rounded-[34px] border border-white/80 bg-white/95 shadow-[0_25px_70px_rgba(9,43,97,0.18)] backdrop-blur-xl">

            {/* Cabecera azul */}

            <div className="relative overflow-hidden bg-gradient-to-br from-[#08295c] via-[#0b4f9e] to-[#139fe0] px-8 pb-10 pt-9 text-center">

              {/* Decoraciones */}

              <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full border border-white/10" />
              <div className="absolute -left-20 -bottom-24 h-52 w-52 rounded-full border border-white/10" />

              <div className="relative">

                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/15 ring-1 ring-white/25 backdrop-blur-md">

                  <CalendarDays
                    size={32}
                    strokeWidth={1.8}
                    className="text-white"
                  />

                </div>

                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.3em] text-[#bfeaff]">
                  Confirmación de cita
                </p>

                <h1 className="text-3xl font-black tracking-tight text-white">
                  ¡Hola {cita.pacientes?.nombre}!
                </h1>

                <div className="mx-auto mt-4 h-1 w-14 rounded-full bg-[#58d0ff]" />

              </div>

            </div>

            {/* =========================
                INFORMACIÓN CITA
            ========================== */}

            <div className="px-7 py-7">

              <div className="rounded-3xl border border-[#e3edf8] bg-[#f8fbff] p-6">

                <p className="mb-5 text-center text-sm font-semibold text-[#7184a0]">
                  Tu cita está agendada para
                </p>

                {/* Fecha */}

                <div className="mb-4 flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8f4ff]">
                    <CalendarDays
                      size={21}
                      className="text-[#1478e8]"
                    />
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8ba0bc]">
                      Fecha
                    </p>

                    <p className="mt-0.5 text-sm font-black capitalize text-[#092b61]">
                      {fecha}
                    </p>
                  </div>

                </div>

                {/* Hora */}

                <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8f4ff]">
                    <Clock3
                      size={21}
                      className="text-[#1478e8]"
                    />
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8ba0bc]">
                      Hora
                    </p>

                    <p className="mt-0.5 text-lg font-black text-[#092b61]">
                      {hora} hrs
                    </p>
                  </div>

                </div>

              </div>

              {/* =========================
                  ESTADOS
              ========================== */}

              <div className="mt-6">

                {yaVencida ? (

                  <div className="rounded-2xl bg-slate-100 px-5 py-4 text-center">
                    <p className="text-sm font-bold text-slate-500">
                      Esta cita ya no está vigente.
                    </p>
                  </div>

                ) : confirmado ? (

                  <div className="rounded-3xl border border-emerald-100 bg-emerald-50 px-6 py-6 text-center">

                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                      <CheckCircle2
                        size={31}
                        strokeWidth={2.3}
                        className="text-emerald-600"
                      />
                    </div>

                    <p className="text-lg font-black uppercase tracking-tight text-emerald-700">
                      ¡Cita confirmada!
                    </p>

                    <p className="mt-1 text-xs font-medium text-emerald-600">
                      Te esperamos en Centro Médico y Dental Dignidad.
                    </p>

                  </div>

                ) : (

                  <button
                    onClick={confirmar}
                    disabled={loading}
                    className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#0867df] to-[#139fe0] py-4 font-black uppercase tracking-[0.12em] text-white shadow-[0_12px_30px_rgba(20,120,232,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_35px_rgba(20,120,232,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    <span className="relative flex items-center justify-center gap-2">

                      {loading ? (
                        <Loader2
                          className="animate-spin"
                          size={19}
                        />
                      ) : (
                        <CheckCircle2 size={19} />
                      )}

                      {loading
                        ? 'Confirmando...'
                        : 'Confirmar mi asistencia'}

                    </span>

                  </button>

                )}

              </div>

              {/* =========================
                  UBICACIÓN
              ========================== */}

              <div className="mt-6 flex items-start gap-3 border-t border-slate-100 pt-5">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fff7e6]">
                  <MapPin
                    size={17}
                    className="text-[#c9a24b]"
                  />
                </div>

                <div>

                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8ba0bc]">
                    Ubicación
                  </p>

                  <p className="mt-0.5 text-xs font-bold text-[#092b61]">
                    Centro Médico y Dental Dignidad
                  </p>

                  <p className="text-xs text-slate-500">
                    Av. Venancia Leiva 1871, La Pintana
                  </p>

                </div>

              </div>

            </div>

          </div>

          {/* Footer */}

          <p className="mt-6 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[#7890ad]">
            Cuidamos tu salud, cuidamos tu sonrisa.
          </p>

        </div>

      </div>

    </main>
  )
}
