'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Nunito, Dancing_Script } from 'next/font/google'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
  Star,
  Stethoscope,
  TriangleAlert,
} from 'lucide-react'

const mainFont = Nunito({ subsets: ['latin'], display: 'swap' })
const scriptFont = Dancing_Script({ subsets: ['latin'], display: 'swap' })

const AMBER = '#FDB92B'
const TEAL = '#0A9BB8'
const GREEN = '#6B9A2A'
const MAGENTA = '#B01C48'
const BORDER = '#E3EAF2'
const BRAND_BAR = [GREEN, TEAL, AMBER, MAGENTA]
const EASE = [0.22, 1, 0.36, 1] as const

const WHATSAPP_CLINICA = '56966467641'
const WHATSAPP_CLINICA_LABEL = '+56 9 6646 7641'

type Horario = { hora: string; recomendado: boolean }
type Dia = { fecha: string; diaNombre: string; diaNumero: number; mes: string; recomendado: boolean; horarios: Horario[] }
type Activo = {
  estado: 'activo'
  paciente: string
  profesional: string
  citaActual: { fecha: string; hora: string; duracion: number }
  dias: Dia[]
}
type Respuesta =
  | Activo
  | { estado: 'no_valido' }
  | { estado: 'expirado' }
  | { estado: 'usado'; fecha: string | null; hora: string | null }

type Vista =
  | { tipo: 'cargando' }
  | { tipo: 'error' }
  | { tipo: 'datos'; datos: Respuesta }
  | { tipo: 'exito'; fecha: string; hora: string; profesional: string; duracion: number }

function linkWhatsApp(mensaje: string) {
  return `https://wa.me/${WHATSAPP_CLINICA}?text=${encodeURIComponent(mensaje)}`
}

function fechaLarga(fecha: string) {
  const texto = new Date(`${fecha}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  return texto.charAt(0).toUpperCase() + texto.slice(1).replace(',', '')
}

function primerDiaSugerido(dias: Dia[]) {
  return dias.find((d) => d.recomendado) ?? dias[0] ?? null
}

async function pedirDatos(token: string): Promise<Vista> {
  try {
    const res = await fetch(`/api/reagendar/${encodeURIComponent(token)}`, { cache: 'no-store' })
    if (!res.ok) throw new Error()
    return { tipo: 'datos', datos: await res.json() }
  } catch {
    return { tipo: 'error' }
  }
}

export default function ReagendarClient({ token }: { token: string }) {
  const [vista, setVista] = useState<Vista>({ tipo: 'cargando' })
  const contenedorRef = useRef<HTMLDivElement>(null)

  useEffect(() => { void pedirDatos(token).then(setVista) }, [token])

  // Cada pantalla parte desde arriba, aunque la anterior haya quedado con scroll
  useEffect(() => { contenedorRef.current?.scrollTo({ top: 0 }) }, [vista.tipo])

  const recargar = () => {
    setVista({ tipo: 'cargando' })
    void pedirDatos(token).then(setVista)
  }

  return (
    <main className={`${mainFont.className} relative h-[100dvh] w-full overflow-hidden bg-[#071B3A]`}>
      <div aria-hidden="true" className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/fondo-agendar.png')" }} />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-[#071B3A]/[0.16]" />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: 'linear-gradient(90deg, rgba(7,27,58,0.30) 0%, rgba(7,27,58,0.05) 48%, rgba(7,27,58,0.16) 100%)' }}
      />

      <div className="relative z-10 flex h-[100dvh] w-full items-center justify-center p-3 sm:p-5 lg:justify-end lg:p-7">
        <section className="flex h-auto max-h-[calc(100dvh-24px)] w-full max-w-[560px] flex-col overflow-hidden rounded-[28px] bg-[#F6F9FD] shadow-[0_28px_90px_-25px_rgba(7,27,58,0.65)] ring-1 ring-white/50 sm:max-h-[calc(100dvh-40px)] lg:max-h-[calc(100dvh-56px)]">
          <BrandBar />
          <div ref={contenedorRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
            <div className="mx-auto w-full max-w-[500px]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={vista.tipo === 'datos' ? vista.datos.estado : vista.tipo}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  {vista.tipo === 'cargando' && <Cargando />}
                  {vista.tipo === 'error' && <AvisoError onReintentar={recargar} />}
                  {vista.tipo === 'exito' && <Exito {...vista} />}
                  {vista.tipo === 'datos' && vista.datos.estado === 'activo' && (
                    <Reagendar
                      token={token}
                      datos={vista.datos}
                      onExito={(fecha, hora, profesional, duracion) => setVista({ tipo: 'exito', fecha, hora, profesional, duracion })}
                      onEnlaceCerrado={recargar}
                    />
                  )}
                  {vista.tipo === 'datos' && vista.datos.estado === 'usado' && <YaReagendada fecha={vista.datos.fecha} hora={vista.datos.hora} />}
                  {vista.tipo === 'datos' && vista.datos.estado === 'expirado' && (
                    <AvisoEnlace titulo="Este enlace venció" texto="Por seguridad, los enlaces duran 7 días. Escríbenos y te enviamos uno nuevo." />
                  )}
                  {vista.tipo === 'datos' && vista.datos.estado === 'no_valido' && (
                    <AvisoEnlace titulo="Este enlace ya no está disponible" texto="Puede que tu hora haya cambiado o que te hayamos enviado un enlace más nuevo. Escríbenos y te ayudamos." />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function Reagendar({
  token,
  datos,
  onExito,
  onEnlaceCerrado,
}: {
  token: string
  datos: Activo
  onExito: (fecha: string, hora: string, profesional: string, duracion: number) => void
  onEnlaceCerrado: () => void
}) {
  const [dias, setDias] = useState(datos.dias)
  const [diaSeleccionado, setDiaSeleccionado] = useState<Dia | null>(() => primerDiaSugerido(datos.dias))
  const [hora, setHora] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState('')
  const resumenRef = useRef<HTMLDivElement>(null)
  const diasRef = useRef<HTMLDivElement>(null)

  const { citaActual, profesional, paciente } = datos

  // El día sugerido puede estar lejos en la tira de días: se lleva a la vista
  useEffect(() => {
    const tira = diasRef.current
    const activo = tira?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (tira && activo) tira.scrollLeft = activo.offsetLeft - tira.offsetLeft - 8
  }, [])

  const recomendados = useMemo(() => diaSeleccionado?.horarios.filter((h) => h.recomendado) ?? [], [diaSeleccionado])
  const otros = useMemo(() => diaSeleccionado?.horarios.filter((h) => !h.recomendado) ?? [], [diaSeleccionado])

  const elegirDia = (dia: Dia) => {
    setDiaSeleccionado(dia)
    setHora(null)
    setAviso('')
  }

  const elegirHora = (valor: string) => {
    setHora(valor)
    setAviso('')
    requestAnimationFrame(() => resumenRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  }

  const confirmar = async () => {
    if (!diaSeleccionado || !hora || guardando) return
    setGuardando(true)
    setAviso('')
    try {
      const res = await fetch(`/api/reagendar/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha: diaSeleccionado.fecha, hora }),
      })
      const r = await res.json()

      if (res.ok) {
        onExito(diaSeleccionado.fecha, hora, profesional, citaActual.duracion)
        return
      }
      if (res.status === 409) {
        // Otro paciente alcanzó a tomarla: se muestran las horas actualizadas sin perder el día
        const nuevos: Dia[] = r.dias ?? []
        setDias(nuevos)
        setDiaSeleccionado(nuevos.find((d) => d.fecha === diaSeleccionado.fecha) ?? primerDiaSugerido(nuevos))
        setHora(null)
        setAviso(r.codigo === 'paciente_ocupado'
          ? 'Ya tienes otra cita a esa hora. Elige un horario distinto.'
          : 'Esa hora acaba de ocuparse. Actualizamos los horarios, elige otro por favor.')
        return
      }
      if (res.status === 410) {
        onEnlaceCerrado()
        return
      }
      throw new Error()
    } catch {
      setAviso('No pudimos guardar el cambio. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  const mensajeAyuda = `Hola, soy ${paciente || 'paciente de la clínica'}. Tengo hora el ${fechaLarga(citaActual.fecha)} a las ${citaActual.hora} con Dr. ${profesional} y ningún horario del enlace me acomoda.`

  return (
    <div>
      <Encabezado paciente={paciente} />

      <div className="rounded-[20px] border bg-white p-4 shadow-[0_10px_28px_-22px_rgba(7,27,58,0.65)]" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${TEAL}12`, color: TEAL }}>
            <Stethoscope size={21} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Tu profesional</p>
            <p className="text-[16px] font-black leading-tight text-[#071B3A]">Dr. {profesional}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-3 border-t pt-3" style={{ borderColor: BORDER }}>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Hora actual</p>
            <p className="mt-0.5 text-sm font-black text-slate-500 line-through decoration-[#B01C48]/60">
              {fechaLarga(citaActual.fecha)}, {citaActual.hora}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Duración</p>
            <p className="mt-0.5 text-sm font-black text-[#071B3A]">{citaActual.duracion} min</p>
          </div>
        </div>
      </div>

      {dias.length === 0 ? (
        <div className="mt-4 rounded-[20px] border border-dashed border-slate-300 bg-white p-6 text-center">
          <CalendarX2 className="mx-auto text-slate-400" size={30} />
          <p className="mt-3 text-sm font-black text-[#071B3A]">Sin horarios por ahora</p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
            Dr. {profesional} no tiene horas en las próximas semanas. Escríbenos y buscamos una opción para ti.
          </p>
        </div>
      ) : (
        <>
          <h2 className="mt-5 text-[19px] font-black tracking-tight text-[#071B3A]">Elige tu nueva hora</h2>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
            Te mostramos los horarios que mejor calzan con la agenda de tu profesional.
          </p>

          <div ref={diasRef} className="mt-3 flex snap-x gap-2 overflow-x-auto pb-2 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: `${TEAL}66 #E8EDF2` }}>
            {dias.map((dia) => {
              const activo = diaSeleccionado?.fecha === dia.fecha
              return (
                <button
                  key={dia.fecha}
                  type="button"
                  onClick={() => elegirDia(dia)}
                  aria-pressed={activo}
                  aria-label={`${fechaLarga(dia.fecha)}${dia.recomendado ? ', recomendado' : ''}`}
                  className="relative flex h-[80px] w-[66px] shrink-0 snap-start flex-col items-center justify-center rounded-2xl border-2 transition"
                  style={activo ? { borderColor: TEAL, backgroundColor: `${TEAL}12` } : { borderColor: BORDER, backgroundColor: '#fff' }}
                >
                  {dia.recomendado && <Star size={11} className="absolute right-1.5 top-1.5" fill={AMBER} stroke={AMBER} aria-hidden="true" />}
                  <span className="text-[10px] font-extrabold uppercase" style={{ color: activo ? TEAL : '#94A3B8' }}>{dia.diaNombre}</span>
                  <span className="mt-0.5 text-xl font-black leading-none text-[#071B3A]">{dia.diaNumero}</span>
                  <span className="mt-1 text-[10px] font-bold text-slate-400">{dia.mes}</span>
                </button>
              )
            })}
          </div>

          {diaSeleccionado && (
            <div className="mt-2 rounded-[20px] border bg-white p-4" style={{ borderColor: BORDER }}>
              <p className="text-sm font-black text-[#071B3A]">{fechaLarga(diaSeleccionado.fecha)}</p>

              {recomendados.length > 0 && (
                <GrupoHoras titulo="Recomendados" destacado horas={recomendados} seleccionada={hora} onElegir={elegirHora} />
              )}
              {otros.length > 0 && (
                <GrupoHoras titulo={recomendados.length > 0 ? 'También disponibles' : 'Disponibles'} horas={otros} seleccionada={hora} onElegir={elegirHora} />
              )}
            </div>
          )}

          {aviso && (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-[#B01C48]/[0.07] px-3 py-2.5 text-xs font-bold text-[#B01C48]">
              <TriangleAlert size={15} className="mt-px shrink-0" /> {aviso}
            </p>
          )}

          <div ref={resumenRef} className="mt-3">
            {hora && diaSeleccionado && (
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-2 rounded-xl px-3 py-2.5 text-[13px] font-bold text-[#071B3A]" style={{ backgroundColor: `${GREEN}12` }}>
                Tu nueva hora: <b className="font-black">{fechaLarga(diaSeleccionado.fecha)}, {hora} hrs</b>
              </motion.p>
            )}
            <motion.button
              type="button"
              whileTap={hora && !guardando ? { scale: 0.985 } : undefined}
              disabled={!hora || guardando}
              onClick={confirmar}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-extrabold uppercase tracking-[0.08em] text-[#071B3A] shadow-[0_10px_25px_-12px_rgba(7,27,58,0.45)] transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: AMBER }}
            >
              {guardando ? <Loader2 className="animate-spin" size={18} /> : <CalendarCheck size={18} />}
              {guardando ? 'Guardando...' : 'Confirmar cambio de hora'}
            </motion.button>
          </div>
        </>
      )}

      <a
        href={linkWhatsApp(mensajeAyuda)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-xs font-extrabold transition hover:bg-[#0A9BB8]/5"
        style={{ borderColor: `${TEAL}55`, color: TEAL }}
      >
        <MessageCircle size={16} /> ¿Ningún horario te sirve? Escríbenos
      </a>
    </div>
  )
}

function GrupoHoras({
  titulo,
  horas,
  seleccionada,
  onElegir,
  destacado = false,
}: {
  titulo: string
  horas: Horario[]
  seleccionada: string | null
  onElegir: (hora: string) => void
  destacado?: boolean
}) {
  return (
    <div className="mt-3">
      <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
        {destacado && <Star size={12} fill={AMBER} stroke={AMBER} aria-hidden="true" />}
        {titulo}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {horas.map(({ hora }) => {
          const activa = seleccionada === hora
          return (
            <button
              key={hora}
              type="button"
              onClick={() => onElegir(hora)}
              aria-pressed={activa}
              className="rounded-xl border py-3 text-sm font-extrabold transition"
              style={
                activa
                  ? { backgroundColor: TEAL, borderColor: TEAL, color: '#fff' }
                  : { backgroundColor: destacado ? `${AMBER}14` : '#fff', borderColor: destacado ? `${AMBER}80` : BORDER, color: '#071B3A' }
              }
            >
              {hora}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Exito({ fecha, hora, profesional, duracion }: { fecha: string; hora: string; profesional: string; duracion: number }) {
  return (
    <div className="rounded-[26px] bg-white p-6 text-center shadow-[0_22px_60px_-30px_rgba(7,27,58,0.55)] sm:p-8">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full"
        style={{ backgroundColor: `${GREEN}1F`, color: GREEN }}
      >
        <CheckCircle2 size={40} />
      </motion.div>
      <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: GREEN }}>Cambio realizado</p>
      <h1 className="mt-2 text-[28px] font-black leading-tight tracking-tight text-[#071B3A]">¡Tu hora quedó reagendada!</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-relaxed text-slate-500">Tu hora anterior ya no está vigente. Te esperamos en la nueva fecha.</p>

      <div className="mt-5 rounded-[20px] border bg-[#F6F9FD] p-5 text-left" style={{ borderColor: BORDER }}>
        <Detalle icono={<CalendarClock size={18} />} etiqueta="Nueva hora" valor={`${fechaLarga(fecha)}, ${hora} hrs`} />
        <Detalle icono={<Stethoscope size={18} />} etiqueta="Profesional" valor={`Dr. ${profesional}`} />
        <Detalle icono={<Clock size={18} />} etiqueta="Duración" valor={`${duracion} minutos`} />
        <Detalle icono={<MapPin size={18} />} etiqueta="Dirección" valor="Av. Venancia Leiva 1871, La Pintana" />
      </div>

      <Firma />
    </div>
  )
}

function YaReagendada({ fecha, hora }: { fecha: string | null; hora: string | null }) {
  return (
    <div className="rounded-[26px] bg-white p-6 text-center shadow-[0_22px_60px_-30px_rgba(7,27,58,0.55)] sm:p-8">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: `${GREEN}1F`, color: GREEN }}>
        <CheckCircle2 size={32} />
      </div>
      <h1 className="mt-4 text-2xl font-black tracking-tight text-[#071B3A]">Tu hora ya fue reagendada</h1>
      {fecha && hora && (
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
          Quedó para el <b className="text-[#071B3A]">{fechaLarga(fecha)} a las {hora} hrs</b>.
        </p>
      )}
      <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">Este enlace sirve una sola vez. Si necesitas otro cambio, escríbenos.</p>
      <BotonWhatsApp mensaje="Hola, ya reagendé mi hora con el enlace y necesito hacer otro cambio." />
    </div>
  )
}

function AvisoEnlace({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-[26px] bg-white p-6 text-center shadow-[0_22px_60px_-30px_rgba(7,27,58,0.55)] sm:p-8">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: `${AMBER}22`, color: '#B8860B' }}>
        <TriangleAlert size={30} />
      </div>
      <h1 className="mt-4 text-2xl font-black tracking-tight text-[#071B3A]">{titulo}</h1>
      <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{texto}</p>
      <BotonWhatsApp mensaje="Hola, quiero cambiar mi hora pero el enlace que me enviaron ya no funciona." />
    </div>
  )
}

function AvisoError({ onReintentar }: { onReintentar: () => void }) {
  return (
    <div className="rounded-[26px] bg-white p-6 text-center shadow-[0_22px_60px_-30px_rgba(7,27,58,0.55)] sm:p-8">
      <h1 className="text-2xl font-black tracking-tight text-[#071B3A]">No pudimos cargar tus horarios</h1>
      <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">Revisa tu conexión e intenta de nuevo.</p>
      <button
        type="button"
        onClick={onReintentar}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-extrabold uppercase tracking-[0.08em] text-[#071B3A]"
        style={{ backgroundColor: AMBER }}
      >
        Reintentar <ArrowRight size={17} />
      </button>
      <BotonWhatsApp mensaje="Hola, quiero cambiar mi hora pero el enlace no me carga." />
    </div>
  )
}

function Encabezado({ paciente }: { paciente: string }) {
  return (
    <div className="mb-4 rounded-[22px] bg-[#071B3A] px-5 py-5 shadow-[0_16px_35px_-22px_rgba(7,27,58,0.8)]">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#22B3CF]">DIGNIDAD</p>
      <h1 className="mt-1 text-[25px] font-black leading-tight tracking-tight text-white">
        {paciente ? `Hola ${paciente}, cambia tu hora` : 'Cambia tu hora'}
      </h1>
      <p className={`${scriptFont.className} mt-1 text-[21px] text-[#22B3CF]`}>Que sonreír sea costumbre</p>
    </div>
  )
}

function Detalle({ icono, etiqueta, valor }: { icono: ReactNode; etiqueta: string; valor: string }) {
  return (
    <div className="flex items-start gap-3 border-b py-2.5 first:pt-0 last:border-b-0 last:pb-0" style={{ borderColor: BORDER }}>
      <span className="mt-0.5 shrink-0" style={{ color: TEAL }}>{icono}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{etiqueta}</p>
        <p className="mt-0.5 text-sm font-black text-[#071B3A]">{valor}</p>
      </div>
    </div>
  )
}

function Firma() {
  return <p className={`${scriptFont.className} mt-5 text-[22px] text-[#0A9BB8]`}>Que sonreír sea costumbre</p>
}

function BotonWhatsApp({ mensaje }: { mensaje: string }) {
  return (
    <a
      href={linkWhatsApp(mensaje)}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-xs font-extrabold transition hover:bg-[#0A9BB8]/5"
      style={{ borderColor: `${TEAL}55`, color: TEAL }}
    >
      <MessageCircle size={16} /> Escríbenos al {WHATSAPP_CLINICA_LABEL}
    </a>
  )
}

function Cargando() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A9BB8]/10 text-[#0A9BB8]">
        <Loader2 className="animate-spin" size={25} />
      </div>
      <p className="mt-3 text-xs font-extrabold text-slate-400">Buscando los mejores horarios...</p>
    </div>
  )
}

function BrandBar() {
  return (
    <div className="flex h-[4px] w-full overflow-hidden" aria-hidden="true">
      {BRAND_BAR.map((color) => <span key={color} className="flex-1" style={{ backgroundColor: color }} />)}
    </div>
  )
}
