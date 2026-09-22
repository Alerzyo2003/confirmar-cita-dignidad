'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  CalendarDays,
  Loader2,
  MapPin,
  Clock3,
} from 'lucide-react'

const NAVY = '#071B3A'
const AMBER = '#FDB92B'
const TEAL = '#0A9BB8'
const GREEN = '#6B9A2A'
const MAGENTA = '#B01C48'
const SOFT = '#F6F9FD'

const BRAND_BAR = [GREEN, TEAL, AMBER, MAGENTA]

export default function ConfirmarCitaClient({
  cita,
}: {
  cita: any
}) {
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

      if (!res.ok) {
        throw new Error()
      }

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
    <main className="relative min-h-screen overflow-hidden bg-[#EAF1F5]">

      {/* =========================================================
          FONDO - FACHADA DE LA CLÍNICA
      ========================================================== */}

      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/fachada-clinica.png')",
        }}
      />

      {/* Capa blanca moderada para mantener visible la fachada */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.38) 45%, rgba(246,249,253,0.52) 100%)',
        }}
      />

      {/* Tinte suave de marca */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(7,27,58,0.035) 0%, rgba(10,155,184,0.055) 100%)',
        }}
      />

      {/* =========================================================
          DECORACIÓN DE FONDO
      ========================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-48 -top-48 z-0 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{
          backgroundColor: 'rgba(10,155,184,0.07)',
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-52 -right-52 z-0 h-[580px] w-[580px] rounded-full blur-3xl"
        style={{
          backgroundColor: 'rgba(253,185,43,0.08)',
        }}
      />

      {/* =========================================================
          BARRA SUPERIOR DE MARCA
      ========================================================== */}

      <div
        aria-hidden="true"
        className="fixed left-0 right-0 top-0 z-30 flex h-1.5"
      >
        {BRAND_BAR.map((color, index) => (
          <div
            key={index}
            className="h-full flex-1"
            style={{
              backgroundColor: color,
            }}
          />
        ))}
      </div>

      {/* =========================================================
          CONTENIDO PRINCIPAL
      ========================================================== */}

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-3 sm:px-5">

        <div className="w-full max-w-[590px]">

          {/* Línea superior */}
          <div className="mb-3 flex justify-center">
            <div
              className="h-1.5 w-[74px] rounded-full"
              style={{
                backgroundColor: AMBER,
                boxShadow:
                  '0 5px 18px rgba(253,185,43,0.35)',
              }}
            />
          </div>

          {/* =====================================================
              TARJETA PRINCIPAL
          ====================================================== */}

          <div
            className="overflow-hidden rounded-[30px] border"
            style={{
              backgroundColor: 'rgba(255,255,255,0.97)',
              borderColor: 'rgba(255,255,255,0.95)',
              boxShadow:
                '0 28px 80px rgba(7,27,58,0.23), 0 8px 25px rgba(7,27,58,0.09)',
            }}
          >

            {/* =================================================
                HEADER AZUL
            ================================================== */}

            <div
              className="relative overflow-hidden px-6 pb-6 pt-6 text-center sm:px-8"
              style={{
                background:
                  'linear-gradient(135deg, #071B3A 0%, #0A315C 48%, #0A7597 100%)',
              }}
            >

              {/* Círculos decorativos */}

              <div
                aria-hidden="true"
                className="absolute -right-20 -top-24 h-52 w-52 rounded-full border border-white/10"
              />

              <div
                aria-hidden="true"
                className="absolute -bottom-28 -left-24 h-56 w-56 rounded-full border border-white/10"
              />

              <div
                aria-hidden="true"
                className="absolute right-11 top-11 h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: AMBER,
                  boxShadow:
                    '0 0 18px rgba(253,185,43,0.6)',
                }}
              />

              <div className="relative">

                {/* Icono */}

                <div
                  className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[19px] border"
                  style={{
                    backgroundColor:
                      'rgba(255,255,255,0.12)',
                    borderColor:
                      'rgba(255,255,255,0.22)',
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 25px rgba(0,0,0,0.12)',
                  }}
                >
                  <CalendarDays
                    size={28}
                    strokeWidth={1.8}
                    className="text-white"
                  />
                </div>

                {/* Texto pequeño */}

                <p
                  className="mb-1.5 text-[9px] font-extrabold uppercase tracking-[0.30em]"
                  style={{
                    color: '#9FE0EB',
                  }}
                >
                  Confirmación de cita
                </p>

                {/* Saludo */}

                <h1 className="text-[26px] font-black tracking-tight text-white sm:text-[30px]">
                  ¡Hola {cita.pacientes?.nombre}!
                </h1>

                {/* Línea */}

                <div
                  className="mx-auto mt-3 h-1 w-14 rounded-full"
                  style={{
                    backgroundColor: AMBER,
                  }}
                />

              </div>
            </div>

            {/* =================================================
                CUERPO
            ================================================== */}

            <div className="px-5 py-4 sm:px-7 sm:py-5">

              {/* =================================================
                  INFORMACIÓN DE LA CITA
              ================================================== */}

              <div
                className="rounded-[22px] border p-4 sm:p-5"
                style={{
                  backgroundColor: '#F4F8FB',
                  borderColor: '#DCE7EF',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.9)',
                }}
              >

                <p className="mb-3 text-center text-[13px] font-extrabold text-[#536A86]">
                  Tu cita está agendada para
                </p>

                {/* FECHA */}

                <div
                  className="mb-2 flex items-center gap-3 rounded-[16px] border p-3"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#EDF2F6',
                    boxShadow:
                      '0 5px 16px rgba(7,27,58,0.045)',
                  }}
                >

                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]"
                    style={{
                      backgroundColor: '#E6F7FA',
                    }}
                  >
                    <CalendarDays
                      size={20}
                      strokeWidth={2}
                      style={{
                        color: TEAL,
                      }}
                    />
                  </div>

                  <div className="min-w-0">

                    <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#8A9DB5]">
                      Fecha
                    </p>

                    <p className="mt-0.5 text-[15px] font-black capitalize text-[#071B3A]">
                      {fecha}
                    </p>

                  </div>

                </div>

                {/* HORA */}

                <div
                  className="flex items-center gap-3 rounded-[16px] border p-3"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#EDF2F6',
                    boxShadow:
                      '0 5px 16px rgba(7,27,58,0.045)',
                  }}
                >

                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]"
                    style={{
                      backgroundColor: '#FFF7E3',
                    }}
                  >
                    <Clock3
                      size={20}
                      strokeWidth={2}
                      style={{
                        color: '#D69A00',
                      }}
                    />
                  </div>

                  <div>

                    <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#8A9DB5]">
                      Hora
                    </p>

                    <p className="mt-0.5 text-[18px] font-black text-[#071B3A]">
                      {hora} hrs
                    </p>

                  </div>

                </div>

              </div>

              {/* =================================================
                  ESTADO / CONFIRMACIÓN
              ================================================== */}

              <div className="mt-4">

                {yaVencida ? (

                  <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-5 py-4 text-center">

                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-200">
                      <CalendarDays
                        size={19}
                        className="text-slate-500"
                      />
                    </div>

                    <p className="text-sm font-extrabold text-slate-500">
                      Esta cita ya no está vigente.
                    </p>

                  </div>

                ) : confirmado ? (

                  <div
                    className="rounded-[21px] border px-5 py-4 text-center"
                    style={{
                      backgroundColor: '#F0F9E9',
                      borderColor: '#D9ECC8',
                    }}
                  >

                    <div
                      className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: '#DFF0CF',
                      }}
                    >
                      <CheckCircle2
                        size={27}
                        strokeWidth={2.3}
                        style={{
                          color: GREEN,
                        }}
                      />
                    </div>

                    <p
                      className="text-[17px] font-black uppercase tracking-tight"
                      style={{
                        color: GREEN,
                      }}
                    >
                      ¡Cita confirmada!
                    </p>

                    <p className="mt-0.5 text-[11px] font-semibold text-[#71915A]">
                      Te esperamos en la clínica.
                    </p>

                  </div>

                ) : (

                  <button
                    type="button"
                    onClick={confirmar}
                    disabled={loading}
                    className="group relative w-full overflow-hidden rounded-[17px] py-3 font-black uppercase tracking-[0.11em] text-white transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      background:
                        'linear-gradient(100deg, #071B3A 0%, #0A526F 52%, #0A9BB8 100%)',
                      boxShadow:
                        '0 12px 28px rgba(7,27,58,0.20)',
                    }}
                  >

                    {/* Brillo */}

                    <span
                      aria-hidden="true"
                      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                    />

                    <span className="relative flex items-center justify-center gap-2 text-[13px]">

                      {loading ? (
                        <Loader2
                          className="animate-spin"
                          size={18}
                        />
                      ) : (
                        <CheckCircle2
                          size={18}
                          strokeWidth={2.2}
                        />
                      )}

                      {loading
                        ? 'Confirmando...'
                        : 'Confirmar mi asistencia'}

                    </span>

                  </button>

                )}

              </div>

              {/* =================================================
                  UBICACIÓN
              ================================================== */}

              <div className="mt-4 flex items-start gap-3 border-t border-[#E8EEF3] pt-3">

                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
                  style={{
                    backgroundColor: '#FBEAF0',
                  }}
                >
                  <MapPin
                    size={17}
                    strokeWidth={2}
                    style={{
                      color: MAGENTA,
                    }}
                  />
                </div>

                <div>

                  <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#8A9DB5]">
                    Ubicación
                  </p>

                  <p className="mt-0.5 text-[13px] font-black text-[#071B3A]">
                    Avenida Venancia Leiva 1871
                  </p>

                  <p className="text-[11px] font-semibold text-slate-500">
                    La Pintana, Santiago
                  </p>

                </div>

              </div>

            </div>

            {/* =================================================
                BARRA INFERIOR DE MARCA
            ================================================== */}

            <div className="flex h-1">
              {BRAND_BAR.map((color, index) => (
                <div
                  key={index}
                  className="flex-1"
                  style={{
                    backgroundColor: color,
                  }}
                />
              ))}
            </div>

          </div>

          {/* =====================================================
              FOOTER
          ====================================================== */}

          <p className="mt-2 text-center text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#627994]">
            Cuidamos tu salud, cuidamos tu sonrisa.
          </p>

        </div>

      </div>

    </main>
  )
}
