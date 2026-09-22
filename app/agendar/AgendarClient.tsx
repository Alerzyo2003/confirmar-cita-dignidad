'use client'

import { useMemo, useState } from 'react'
import { Nunito, Dancing_Script } from 'next/font/google'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Baby,
  CalendarCheck,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Footprints,
  IdCard,
  Loader2,
  Search,
  ShieldCheck,
  Smile,
  Sparkles,
  Stethoscope,
  User,
  Users,
} from 'lucide-react'

const mainFont = Nunito({ subsets: ['latin'], display: 'swap' })
const scriptFont = Dancing_Script({ subsets: ['latin'], display: 'swap' })

const NAVY = '#071B3A'
const AMBER = '#FDB92B'
const TEAL = '#0A9BB8'
const GREEN = '#6B9A2A'
const MAGENTA = '#B01C48'
const SOFT = '#F6F9FD'
const BORDER = '#E3EAF2'
const BRAND_BAR = [GREEN, TEAL, AMBER, MAGENTA]

const EASE = [0.22, 1, 0.36, 1] as const

type Especialidad = { id: string; nombre: string; cantidadProfesionales: number }
type Profesional = { id: string; user_id: string; nombre: string; apellido: string; especialidades: string[] }
type Paciente = { id: string; nombre: string; apellido: string; rut: string; telefono: string | null; email?: string; activo: boolean; motivo_deshabilitado: string | null }
type DiaDisponible = { fecha: string; diaNombre: string; diaNumero: number; slots: string[] }
type Paso = 'inicio' | 'especialidades' | 'profesionalesPorEspecialidad' | 'profesionales' | 'documento' | 'fecha_hora' | 'exito'

type AreaVisual = {
  color: string
  soft: string
  label: string
  icon: typeof ShieldCheck
}

const AREAS_VISUALES: Record<string, AreaVisual> = {
  cirugia: { color: TEAL, soft: `${TEAL}12`, label: 'Cirugía e implantes', icon: ShieldCheck },
  ortodoncia: { color: AMBER, soft: `${AMBER}18`, label: 'Ortodoncia y niños', icon: Baby },
  endodoncia: { color: GREEN, soft: `${GREEN}14`, label: 'Endodoncia', icon: Stethoscope },
  rehabilitacion: { color: MAGENTA, soft: `${MAGENTA}12`, label: 'Rehabilitación', icon: Sparkles },
  general: { color: TEAL, soft: `${TEAL}12`, label: 'Odontología general', icon: Smile },
  podologia: { color: MAGENTA, soft: `${MAGENTA}12`, label: 'Podología', icon: Footprints },
  default: { color: NAVY, soft: `${NAVY}0A`, label: 'Atención odontológica', icon: Smile },
}

function areaFromText(text: string): AreaVisual {
  const value = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (value.includes('ortodon') || value.includes('odontopedi') || value.includes('nino') || value.includes('niño')) return AREAS_VISUALES.ortodoncia
  if (value.includes('endodon')) return AREAS_VISUALES.endodoncia
  if (value.includes('rehabil') || value.includes('estet') || value.includes('protesis') || value.includes('prótesis')) return AREAS_VISUALES.rehabilitacion
  if (value.includes('podolog')) return AREAS_VISUALES.podologia
  if (value.includes('implant') || value.includes('cirug') || value.includes('maxilofacial')) return AREAS_VISUALES.cirugia
  if (value.includes('general') || value.includes('odontolog')) return AREAS_VISUALES.general
  return AREAS_VISUALES.default
}

function getAreaVisual(especialidades: string[] = [], fallback = '') {
  const combined = [...especialidades, fallback].join(' ')
  return areaFromText(combined)
}

function BrandBar() {
  return (
    <div className="flex h-[4px] w-full overflow-hidden" aria-hidden="true">
      {BRAND_BAR.map((color, index) => (
        <motion.span
          key={color}
          className="flex-1 origin-left"
          style={{ backgroundColor: color }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: index * 0.05, ease: EASE }}
        />
      ))}
    </div>
  )
}

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>
      <h1 className="mt-1 text-[27px] font-black leading-tight tracking-tight text-[#071B3A]">{title}</h1>
      {description && <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{description}</p>}
    </motion.div>
  )
}

export default function AgendarClient() {
  const [paso, setPaso] = useState<Paso>('inicio')
  const [cargando, setCargando] = useState(false)
  const [agendando, setAgendando] = useState(false)
  const [error, setError] = useState('')

  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [profesionales, setProfesionales] = useState<Profesional[]>([])
  const [especialidadSeleccionada, setEspecialidadSeleccionada] = useState<Especialidad | null>(null)
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState<Profesional | null>(null)

  const [esOtroDocumento, setEsOtroDocumento] = useState(false)
  const [documento, setDocumento] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [pacienteEncontrado, setPacienteEncontrado] = useState<Paciente | null | 'no_encontrado'>(null)

  const [creandoNuevo, setCreandoNuevo] = useState(false)
  const [datosNuevoPaciente, setDatosNuevoPaciente] = useState({ nombre: '', apellido: '', rut: '', telefono: '', email: '' })

  const [diasDisponibles, setDiasDisponibles] = useState<DiaDisponible[]>([])
  const [diaSeleccionado, setDiaSeleccionado] = useState<DiaDisponible | null>(null)
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null)

  const areaActual = useMemo(() => {
    if (especialidadSeleccionada) return areaFromText(especialidadSeleccionada.nombre)
    if (profesionalSeleccionado) return getAreaVisual(profesionalSeleccionado.especialidades)
    return AREAS_VISUALES.default
  }, [especialidadSeleccionada, profesionalSeleccionado])
  const AreaIcon = areaActual.icon

  const irAEspecialidades = async () => {
    setError('')
    setPaso('especialidades')
    setCargando(true)
    try {
      const res = await fetch('/api/especialidades')
      if (!res.ok) throw new Error()
      setEspecialidades(await res.json())
    } catch {
      setEspecialidades([])
      setError('No pudimos cargar las especialidades.')
    } finally {
      setCargando(false)
    }
  }

  const irAProfesionales = async () => {
    setError('')
    setPaso('profesionales')
    setCargando(true)
    try {
      const res = await fetch('/api/profesionales-publico')
      if (!res.ok) throw new Error()
      setProfesionales(await res.json())
    } catch {
      setProfesionales([])
      setError('No pudimos cargar los profesionales.')
    } finally {
      setCargando(false)
    }
  }

  const seleccionarEspecialidad = async (esp: Especialidad) => {
    setError('')
    setEspecialidadSeleccionada(esp)
    setPaso('profesionalesPorEspecialidad')
    setCargando(true)
    try {
      const res = await fetch(`/api/profesionales-publico?especialidadId=${esp.id}`)
      if (!res.ok) throw new Error()
      setProfesionales(await res.json())
    } catch {
      setProfesionales([])
      setError('No pudimos cargar los profesionales de esta especialidad.')
    } finally {
      setCargando(false)
    }
  }

  const buscarPaciente = async () => {
    setError('')
    if (!documento.trim()) return setError('Ingresa tu documento')
    setBuscando(true)
    try {
      const res = await fetch('/api/buscar-paciente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor: documento, esOtroDocumento }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error de conexión')
      if (!data.paciente) {
        setPacienteEncontrado('no_encontrado')
        setDatosNuevoPaciente((prev) => ({ ...prev, rut: documento }))
      } else if (!data.paciente.activo) {
        setError(data.paciente.motivo_deshabilitado || 'Contacta a la clínica para habilitar tu cuenta.')
        setPacienteEncontrado(null)
      } else {
        setPacienteEncontrado(data.paciente)
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al buscar tu ficha.')
    } finally {
      setBuscando(false)
    }
  }

  const cargarHorarios = async () => {
    if (!profesionalSeleccionado) return
    setError('')
    setPaso('fecha_hora')
    setCargando(true)
    setHoraSeleccionada(null)
    try {
      const res = await fetch(`/api/disponibilidad?userId=${profesionalSeleccionado.user_id}&profId=${profesionalSeleccionado.id}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setDiasDisponibles(data)
      setDiaSeleccionado(data.length > 0 ? data[0] : null)
    } catch {
      setError('Error al cargar los horarios.')
    } finally {
      setCargando(false)
    }
  }

  const confirmarCita = async () => {
    if (!pacienteEncontrado || pacienteEncontrado === 'no_encontrado' || !profesionalSeleccionado || !diaSeleccionado || !horaSeleccionada) return
    setAgendando(true)
    setError('')
    try {
      const res = await fetch('/api/crear-cita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: pacienteEncontrado.id === 'NUEVO' ? null : pacienteEncontrado.id,
          pacienteNuevo: pacienteEncontrado.id === 'NUEVO' ? pacienteEncontrado : null,
          profesionalId: profesionalSeleccionado.user_id,
          fecha: diaSeleccionado.fecha,
          hora: horaSeleccionada,
          esOtroDocumento,
        }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Error al agendar')
      }
      setPaso('exito')
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al agendar. Esa hora podría ya estar ocupada, recarga e intenta de nuevo.')
    } finally {
      setAgendando(false)
    }
  }

  const volver = () => {
    setError('')
    if (paso === 'fecha_hora') setPaso('documento')
    else if (paso === 'documento') {
      setPacienteEncontrado(null)
      setCreandoNuevo(false)
      setPaso(especialidadSeleccionada ? 'profesionalesPorEspecialidad' : 'profesionales')
    } else if (paso === 'profesionalesPorEspecialidad') setPaso('especialidades')
    else if (paso === 'profesionales' || paso === 'especialidades') {
      setPaso('inicio')
      setEspecialidadSeleccionada(null)
    }
  }

  const seleccionarProfesional = (profesional: Profesional) => {
    setError('')
    setProfesionalSeleccionado(profesional)
    setPaso('documento')
  }

  return (
    <main className={`${mainFont.className} relative h-[100dvh] w-full overflow-hidden bg-[#071B3A]`}>
      {/* Fondo fijo: nunca cambia su encuadre al cambiar de paso. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/fondo-agendar.png')" }}
      />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-[#071B3A]/[0.16]" />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: 'linear-gradient(90deg, rgba(7,27,58,0.30) 0%, rgba(7,27,58,0.05) 48%, rgba(7,27,58,0.16) 100%)' }}
      />

      <div className="relative z-10 flex h-[100dvh] w-full items-center justify-center p-3 sm:p-5 lg:justify-end lg:p-7">
        <section className="flex h-auto max-h-[calc(100dvh-24px)] w-full max-w-[560px] flex-col overflow-hidden rounded-[28px] bg-[#F6F9FD] shadow-[0_28px_90px_-25px_rgba(7,27,58,0.65)] ring-1 ring-white/50 sm:max-h-[calc(100dvh-40px)] lg:max-h-[calc(100dvh-56px)]">
          <BrandBar />

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
            <div className="mx-auto w-full max-w-[500px]">
              {paso !== 'exito' && (
                <motion.div
                  layout
                  className="mb-5 rounded-[22px] bg-[#071B3A] px-5 py-5 shadow-[0_16px_35px_-22px_rgba(7,27,58,0.8)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#22B3CF]">DIGNIDAD</p>
                      <h1 className="mt-1 text-[25px] font-black tracking-tight text-white">Agendar una cita</h1>
                      <p className={`${scriptFont.className} mt-1 text-[21px] text-[#22B3CF]`}>Que sonreír sea costumbre</p>
                    </div>
                    <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-white/10 sm:flex">
                      <CalendarDays className="h-6 w-6 text-[#FDB92B]" />
                    </div>
                  </div>
                </motion.div>
              )}

              {paso !== 'inicio' && paso !== 'exito' && (
                <button
                  type="button"
                  onClick={volver}
                  className="mb-4 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-extrabold uppercase tracking-wide text-slate-500 transition hover:bg-white hover:text-[#0A9BB8]"
                >
                  <ArrowLeft size={14} /> Volver
                </button>
              )}

              <AnimatePresence mode="wait" initial={false}>
                {paso === 'inicio' && (
                  <motion.div key="inicio" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }}>
                    <SectionTitle
                      eyebrow="Reserva online"
                      title="¿Cómo quieres buscar?"
                      description="Encuentra tu especialidad o elige directamente a tu profesional."
                    />

                    <div className="mt-6 grid gap-3">
                      <motion.button
                        type="button"
                        onClick={irAEspecialidades}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.985 }}
                        className="group relative overflow-hidden rounded-[22px] border bg-white p-5 text-left shadow-[0_12px_30px_-22px_rgba(7,27,58,0.5)] transition hover:shadow-[0_18px_38px_-24px_rgba(7,27,58,0.6)]"
                        style={{ borderColor: `${TEAL}38` }}
                      >
                        <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: TEAL }} />
                        <div className="flex items-center gap-4">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${TEAL}12`, color: TEAL }}>
                            <Users size={23} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[17px] font-black text-[#071B3A]">Buscar por especialidad</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">Ortodoncia, endodoncia, implantes...</p>
                          </div>
                          <ChevronRight className="ml-auto shrink-0 text-slate-300 transition group-hover:translate-x-1" size={21} />
                        </div>
                      </motion.button>

                      <motion.button
                        type="button"
                        onClick={irAProfesionales}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.985 }}
                        className="group relative overflow-hidden rounded-[22px] border bg-white p-5 text-left shadow-[0_12px_30px_-22px_rgba(7,27,58,0.5)] transition hover:shadow-[0_18px_38px_-24px_rgba(7,27,58,0.6)]"
                        style={{ borderColor: `${AMBER}55` }}
                      >
                        <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: AMBER }} />
                        <div className="flex items-center gap-4">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${AMBER}20`, color: '#B8860B' }}>
                            <User size={23} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[17px] font-black text-[#071B3A]">Buscar por profesional</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">Elige directamente a tu doctor/a</p>
                          </div>
                          <ChevronRight className="ml-auto shrink-0 text-slate-300 transition group-hover:translate-x-1" size={21} />
                        </div>
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {paso === 'especialidades' && (
                  <motion.div key="especialidades" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }}>
                    <SectionTitle eyebrow="Paso 1" title="Elige una especialidad" description="Selecciona el área que necesitas para ver sus profesionales." />
                    <div className="mt-5 space-y-2.5">
                      {cargando ? (
                        <Loading />
                      ) : especialidades.length === 0 ? (
                        <EmptyState message="No hay especialidades disponibles." />
                      ) : (
                        especialidades.map((esp, index) => {
                          const area = areaFromText(esp.nombre)
                          const Icon = area.icon
                          return (
                            <motion.button
                              key={esp.id}
                              type="button"
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: Math.min(index * 0.035, 0.25), duration: 0.3 }}
                              whileHover={{ x: 2 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => seleccionarEspecialidad(esp)}
                              className="group relative flex w-full items-center gap-3 overflow-hidden rounded-[18px] border bg-white p-4 text-left shadow-[0_8px_22px_-20px_rgba(7,27,58,0.6)]"
                              style={{ borderColor: `${area.color}35` }}
                            >
                              <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: area.color }} />
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: area.soft, color: area.color }}>
                                <Icon size={19} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-[15px] font-black text-[#071B3A]">{esp.nombre}</span>
                                <span className="mt-0.5 block text-xs font-semibold text-slate-400">{esp.cantidadProfesionales} {esp.cantidadProfesionales === 1 ? 'profesional' : 'profesionales'}</span>
                              </span>
                              <ChevronRight className="shrink-0 text-slate-300 transition group-hover:translate-x-1" size={19} />
                            </motion.button>
                          )
                        })
                      )}
                    </div>
                  </motion.div>
                )}

                {(paso === 'profesionales' || paso === 'profesionalesPorEspecialidad') && (
                  <motion.div key="profesionales" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }}>
                    <SectionTitle
                      eyebrow={especialidadSeleccionada ? 'Especialidad seleccionada' : 'Paso 1'}
                      title={especialidadSeleccionada?.nombre || 'Elige tu profesional'}
                      description={especialidadSeleccionada ? 'Selecciona el profesional con quien quieres atenderte.' : 'Puedes elegir directamente a tu doctor/a.'}
                    />

                    {cargando ? (
                      <Loading />
                    ) : profesionales.length === 0 ? (
                      <EmptyState message="No hay profesionales disponibles." />
                    ) : (
                      <div className="mt-5 space-y-2.5">
                        {profesionales.map((profesional, index) => {
                          const area = getAreaVisual(profesional.especialidades, especialidadSeleccionada?.nombre)
                          const Icon = area.icon
                          return (
                            <motion.button
                              key={profesional.id}
                              type="button"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: Math.min(index * 0.035, 0.28), duration: 0.3 }}
                              whileHover={{ y: -1, x: 1 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => seleccionarProfesional(profesional)}
                              className="group relative w-full overflow-hidden rounded-[20px] border bg-white p-4 text-left shadow-[0_9px_25px_-21px_rgba(7,27,58,0.65)] transition-shadow hover:shadow-[0_16px_35px_-22px_rgba(7,27,58,0.7)]"
                              style={{ borderColor: `${area.color}30` }}
                            >
                              <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: area.color }} />
                              <div className="flex items-start gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-black" style={{ backgroundColor: area.soft, color: area.color }}>
                                  {profesional.nombre?.[0]}{profesional.apellido?.[0]}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[16px] font-black leading-tight text-[#071B3A]">Dr. {profesional.nombre} {profesional.apellido}</p>
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {profesional.especialidades?.length > 0 ? (
                                      profesional.especialidades.map((esp) => {
                                        const espArea = areaFromText(esp)
                                        const EspIcon = espArea.icon
                                        return (
                                          <span key={esp} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold" style={{ backgroundColor: espArea.soft, color: espArea.color }}>
                                            <EspIcon size={11} />
                                            {esp}
                                          </span>
                                        )
                                      })
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold" style={{ backgroundColor: area.soft, color: area.color }}>
                                        <Icon size={11} /> {area.label}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <ChevronRight className="mt-2 shrink-0 text-slate-300 transition group-hover:translate-x-1" size={19} />
                              </div>
                            </motion.button>
                          )
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {paso === 'documento' && (
                  <motion.div key="documento" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }}>
                    <SectionTitle eyebrow="Paso 2" title="Identifica tu ficha" description={`Agendando con Dr. ${profesionalSeleccionado?.nombre} ${profesionalSeleccionado?.apellido}.`} />

                    <div className="mt-5 rounded-[22px] border bg-white p-5 shadow-[0_10px_28px_-22px_rgba(7,27,58,0.65)]" style={{ borderColor: `${areaActual.color}35` }}>
                      <div className="mb-5 flex items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: areaActual.soft }}>
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ color: areaActual.color }}>
                          <AreaIcon size={20} />
                        </span>
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Profesional</p>
                          <p className="text-sm font-black text-[#071B3A]">Dr. {profesionalSeleccionado?.nombre} {profesionalSeleccionado?.apellido}</p>
                        </div>
                      </div>

                      {pacienteEncontrado && pacienteEncontrado !== 'no_encontrado' && !creandoNuevo ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 rounded-2xl border p-4" style={{ borderColor: `${GREEN}45`, backgroundColor: `${GREEN}0B` }}>
                            <IdCard className="shrink-0" style={{ color: GREEN }} size={23} />
                            <div>
                              <p className="text-base font-black text-[#071B3A]">{pacienteEncontrado.nombre} {pacienteEncontrado.apellido}</p>
                              <p className="mt-0.5 text-xs font-extrabold" style={{ color: GREEN }}>RUT: {pacienteEncontrado.rut}</p>
                            </div>
                          </div>
                          <PrimaryButton color={AMBER} onClick={cargarHorarios}>
                            Continuar a elegir horario <ArrowRight size={17} />
                          </PrimaryButton>
                        </div>
                      ) : pacienteEncontrado === 'no_encontrado' || creandoNuevo ? (
                        <NewPatientForm
                          data={datosNuevoPaciente}
                          setData={setDatosNuevoPaciente}
                          error={error}
                          creandoNuevo={creandoNuevo}
                          onCancel={() => { setCreandoNuevo(false); setError('') }}
                          onSubmit={() => {
                            if (!datosNuevoPaciente.nombre.trim() || !datosNuevoPaciente.apellido.trim() || !datosNuevoPaciente.rut.trim() || !datosNuevoPaciente.telefono.trim()) {
                              setError('Completa nombre, apellido, RUT y teléfono para continuar.')
                              return
                            }
                            setError('')
                            setPacienteEncontrado({
                              id: 'NUEVO',
                              nombre: datosNuevoPaciente.nombre,
                              apellido: datosNuevoPaciente.apellido,
                              rut: datosNuevoPaciente.rut,
                              telefono: datosNuevoPaciente.telefono,
                              email: datosNuevoPaciente.email,
                              activo: true,
                              motivo_deshabilitado: null,
                            })
                            void cargarHorarios()
                          }}
                        />
                      ) : (
                        <div className="space-y-4">
                          <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-[#071B3A]">
                            <input
                              type="checkbox"
                              checked={esOtroDocumento}
                              onChange={(e) => {
                                setEsOtroDocumento(e.target.checked)
                                setDocumento('')
                                setError('')
                                setPacienteEncontrado(null)
                                setDatosNuevoPaciente({ nombre: '', apellido: '', rut: '', telefono: '', email: '' })
                              }}
                              className="h-5 w-5 rounded accent-[#0A9BB8]"
                            />
                            Soy extranjero / tengo otro documento
                          </label>

                          <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                              type="text"
                              placeholder={esOtroDocumento ? 'Ingresa tu N° de documento' : 'Ingresa tu RUT (ej: 20791085-6)'}
                              value={documento}
                              onChange={(e) => { setDocumento(e.target.value); setError(''); setPacienteEncontrado(null) }}
                              onKeyDown={(e) => e.key === 'Enter' && !buscando && void buscarPaciente()}
                              className="w-full rounded-xl border bg-[#F8FAFC] py-4 pl-11 pr-4 text-sm font-bold text-[#071B3A] outline-none transition focus:border-[#0A9BB8] focus:ring-2 focus:ring-[#0A9BB8]/10"
                              style={{ borderColor: BORDER }}
                            />
                          </div>

                          {error && <ErrorMessage>{error}</ErrorMessage>}

                          <PrimaryButton color={TEAL} disabled={buscando || !documento.trim()} onClick={buscarPaciente}>
                            {buscando ? <Loader2 className="animate-spin" size={18} /> : <Search size={17} />}
                            Buscar mi ficha
                          </PrimaryButton>

                          <div className="pt-1 text-center">
                            <button
                              type="button"
                              onClick={() => { setCreandoNuevo(true); setDatosNuevoPaciente((prev) => ({ ...prev, rut: documento })); setError('') }}
                              className="text-xs font-extrabold text-[#0A9BB8] underline-offset-4 hover:underline"
                            >
                              ¿No tienes ficha? Crea una nueva aquí
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {paso === 'fecha_hora' && (
                  <motion.div key="fecha" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }}>
                    <SectionTitle eyebrow="Paso 3 · Paso final" title="Elige día y hora" description={`Con Dr. ${profesionalSeleccionado?.nombre} ${profesionalSeleccionado?.apellido}.`} />

                    {error && <div className="mt-4"><ErrorMessage>{error}</ErrorMessage></div>}

                    <div className="mt-5 rounded-[22px] border bg-white p-5 shadow-[0_10px_28px_-22px_rgba(7,27,58,0.65)]" style={{ borderColor: `${areaActual.color}30` }}>
                      {cargando ? (
                        <Loading message="Buscando horas libres..." />
                      ) : diasDisponibles.length === 0 ? (
                        <EmptyState message="Este profesional no tiene horas disponibles en los próximos 30 días." />
                      ) : (
                        <div>
                          <p className="text-sm font-black text-[#071B3A]">Días disponibles</p>
<div className="mt-3">
                            <div
                              className="flex snap-x gap-2 overflow-x-auto pb-3 pr-1"
                              style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor: `${areaActual.color}66 #E8EDF2`,
                              }}
                            >
                              {diasDisponibles.map((dia) => {
                                const seleccionado = diaSeleccionado?.fecha === dia.fecha
                                return (
                                  <button
                                    key={dia.fecha}
                                    type="button"
                                    onClick={() => {
                                      setDiaSeleccionado(dia)
                                      setHoraSeleccionada(null)
                                    }}
                                    className="flex h-[76px] w-[66px] shrink-0 snap-start flex-col items-center justify-center rounded-2xl border-2 transition"
                                    style={
                                      seleccionado
                                        ? { borderColor: areaActual.color, backgroundColor: areaActual.soft }
                                        : { borderColor: BORDER, backgroundColor: '#F8FAFC' }
                                    }
                                  >
                                    <span
                                      className="text-[10px] font-extrabold uppercase"
                                      style={{ color: seleccionado ? areaActual.color : '#94A3B8' }}
                                    >
                                      {dia.diaNombre}
                                    </span>
                                    <span
                                      className="mt-1 text-xl font-black"
                                      style={{ color: seleccionado ? NAVY : '#334155' }}
                                    >
                                      {dia.diaNumero}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>

                            {diasDisponibles.length > 5 && (
                              <div className="mt-1 flex items-center justify-center gap-1.5 text-[10px] font-extrabold text-slate-400">
                                <span>Desliza hacia la derecha para ver más días</span>
                                <ArrowRight size={12} style={{ color: areaActual.color }} />
                              </div>
                            )}
                          </div>

                          {diaSeleccionado && (
                            <div className="mt-4 border-t pt-4" style={{ borderColor: BORDER }}>
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-black text-[#071B3A]">Horas disponibles</p>
                                <span className="text-[10px] font-extrabold text-slate-400">{diaSeleccionado.fecha}</span>
                              </div>
                              <div className="mt-3 grid max-h-48 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                                {diaSeleccionado.slots.map((hora) => {
                                  const seleccionada = horaSeleccionada === hora
                                  return (
                                    <button
                                      key={hora}
                                      type="button"
                                      onClick={() => setHoraSeleccionada(hora)}
                                      className="rounded-xl border py-2.5 text-sm font-extrabold transition"
                                      style={seleccionada ? { backgroundColor: areaActual.color, borderColor: areaActual.color, color: '#fff' } : { backgroundColor: '#fff', borderColor: BORDER, color: NAVY }}
                                    >
                                      {hora}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          <PrimaryButton color={AMBER} disabled={!horaSeleccionada || agendando} onClick={confirmarCita} className="mt-5">
                            {agendando ? <Loader2 className="animate-spin" size={18} /> : <CalendarCheck size={18} />}
                            Confirmar evaluación
                          </PrimaryButton>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {paso === 'exito' && (
                  <motion.div key="exito" initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}>
                    <div className="rounded-[26px] bg-white p-6 text-center shadow-[0_22px_60px_-30px_rgba(7,27,58,0.55)] sm:p-8">
                      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: `${GREEN}15`, color: GREEN }}>
                        <CheckCircle size={42} />
                      </div>
                      <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: GREEN }}>Agendamiento confirmado</p>
                      <h2 className="mt-2 text-3xl font-black tracking-tight text-[#071B3A]">¡Cita confirmada!</h2>
                      <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-relaxed text-slate-500">Tu evaluación presencial ha sido agendada con éxito.</p>

                      <div className="mt-6 rounded-[20px] border p-5 text-left" style={{ borderColor: BORDER, backgroundColor: SOFT }}>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Profesional</p>
                        <p className="mt-1 text-lg font-black text-[#071B3A]">Dr. {profesionalSeleccionado?.nombre} {profesionalSeleccionado?.apellido}</p>
                        <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4" style={{ borderColor: BORDER }}>
                          <div>
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Fecha</p>
                            <p className="mt-1 text-sm font-black text-[#071B3A]">{diaSeleccionado?.fecha}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Hora</p>
                            <p className="mt-1 text-sm font-black" style={{ color: areaActual.color }}>{horaSeleccionada}</p>
                          </div>
                        </div>
                      </div>

                      <button type="button" onClick={() => window.location.reload()} className="mt-6 text-xs font-extrabold uppercase tracking-widest text-slate-400 underline underline-offset-4 hover:text-[#071B3A]">
                        Agendar otra cita / Volver al inicio
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function Loading({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A9BB8]/10 text-[#0A9BB8]">
        <Loader2 className="animate-spin" size={25} />
      </div>
      <p className="mt-3 text-xs font-extrabold text-slate-400">{message}</p>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-400">{message}</div>
}

function ErrorMessage({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-[#B01C48]/[0.07] px-3 py-2.5 text-xs font-bold text-[#B01C48]">{children}</p>
}

function PrimaryButton({
  color,
  children,
  onClick,
  disabled = false,
  className = '',
}: {
  color: string
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <motion.button
      type="button"
      whileHover={!disabled ? { y: -1 } : undefined}
      whileTap={!disabled ? { scale: 0.985 } : undefined}
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-extrabold uppercase tracking-[0.08em] text-[#071B3A] shadow-[0_10px_25px_-12px_rgba(7,27,58,0.45)] transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{ backgroundColor: color }}
    >
      {children}
    </motion.button>
  )
}

function NewPatientForm({
  data,
  setData,
  error,
  creandoNuevo,
  onCancel,
  onSubmit,
}: {
  data: { nombre: string; apellido: string; rut: string; telefono: string; email: string }
  setData: React.Dispatch<React.SetStateAction<{ nombre: string; apellido: string; rut: string; telefono: string; email: string }>>
  error: string
  creandoNuevo: boolean
  onCancel: () => void
  onSubmit: () => void
}) {
  const inputClass = 'w-full rounded-xl border bg-[#F8FAFC] px-3.5 py-3 text-sm font-bold text-[#071B3A] outline-none transition focus:border-[#0A9BB8] focus:ring-2 focus:ring-[#0A9BB8]/10'

  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: `${AMBER}55`, backgroundColor: `${AMBER}0B` }}>
      <p className="text-sm font-bold leading-relaxed text-[#8A6510]">
        {creandoNuevo ? 'Registro de nuevo paciente.' : 'No encontramos tu ficha.'} Ingresa tus datos para continuar.
      </p>
      {error && <div className="mt-3"><ErrorMessage>{error}</ErrorMessage></div>}
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <input aria-label="Nombre" type="text" placeholder="Nombre" className={inputClass} value={data.nombre} onChange={(e) => setData({ ...data, nombre: e.target.value })} />
        <input aria-label="Apellido" type="text" placeholder="Apellido" className={inputClass} value={data.apellido} onChange={(e) => setData({ ...data, apellido: e.target.value })} />
        <input aria-label="RUT o documento" type="text" placeholder="RUT o documento" className={inputClass} value={data.rut} onChange={(e) => setData({ ...data, rut: e.target.value })} />
        <input aria-label="Teléfono" type="tel" placeholder="Teléfono" className={inputClass} value={data.telefono} onChange={(e) => setData({ ...data, telefono: e.target.value })} />
        <input aria-label="Correo" type="email" placeholder="Correo (opcional)" className={`${inputClass} sm:col-span-2`} value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} />
      </div>
      <div className="mt-3 flex gap-2">
        {creandoNuevo && (
          <button type="button" onClick={onCancel} className="w-1/3 rounded-xl border bg-white py-3 text-xs font-extrabold uppercase tracking-wide text-slate-400" style={{ borderColor: BORDER }}>
            Cancelar
          </button>
        )}
        <PrimaryButton color={AMBER} onClick={onSubmit} className={creandoNuevo ? 'flex-1' : ''}>
          Registrar y elegir hora
        </PrimaryButton>
      </div>
    </div>
  )
}
