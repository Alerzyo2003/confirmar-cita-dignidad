// Acceso a datos del reagendamiento. Solo se usa en el servidor: lleva la llave service_role.
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { construirDias, HORIZONTE_DIAS, sumarDias, type DiaConHorarios, type FilaCita } from './horarios'

const ZONA_CLINICA = 'America/Santiago'
const LIMITE_FILAS = 1000
const FORMATO_TOKEN = /^[A-Za-z0-9_-]{32}$/

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function tokenConFormatoValido(token: string) {
  return FORMATO_TOKEN.test(token)
}

// La fecha y hora de la clínica, sin importar la zona horaria del servidor
export function ahoraEnClinica(ahora = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONA_CLINICA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(ahora).map((p) => [p.type, p.value])
  )
  return {
    fecha: `${partes.year}-${partes.month}-${partes.day}`,
    minutos: Number(partes.hour) * 60 + Number(partes.minute),
  }
}

type FilaEnlace = {
  id: string
  cita_id: string
  estado: 'activo' | 'usado' | 'revocado'
  expira_en: string
  inicio_original: string
  fin_original: string
  estado_original: string | null
  inicio_nuevo: string | null
  fin_nuevo: string | null
}

type CitaEnlace = {
  id: string
  paciente_id: string
  profesional_id: string
  inicio: string
  fin: string
  estado: string | null
  pacientes: { nombre: string | null } | { nombre: string | null }[] | null
}

export type EstadoEnlace =
  | { estado: 'no_valido' }
  | { estado: 'expirado' }
  | { estado: 'usado'; fecha: string | null; hora: string | null }
  | { estado: 'activo'; cita: CitaEnlace; nombrePaciente: string; profesional: Profesional; duracion: number }

export type Profesional = { id: string; nombre: string; apellido: string }

const mismoInstante = (a: string, b: string) => new Date(a).getTime() === new Date(b).getTime()

function enAtencion(estado: string | null) {
  const e = (estado || '').toLowerCase()
  return e.startsWith('atend') || e === 'en_espera' || e === 'en sala de espera'
}

function primerNombre(nombre: string | null | undefined) {
  const n = (nombre || '').trim().split(/\s+/)[0] || ''
  return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : ''
}

export async function cargarEnlace(token: string): Promise<EstadoEnlace> {
  if (!tokenConFormatoValido(token)) return { estado: 'no_valido' }
  const db = admin()

  const { data: enlace, error } = await db
    .from('reagendamiento_enlaces')
    .select('id, cita_id, estado, expira_en, inicio_original, fin_original, estado_original, inicio_nuevo, fin_nuevo')
    .eq('token_hash', hashToken(token))
    .maybeSingle<FilaEnlace>()
  if (error) throw error
  if (!enlace || enlace.estado === 'revocado') return { estado: 'no_valido' }

  if (enlace.estado === 'usado') {
    const [fecha, hora] = (enlace.inicio_nuevo || '').split('T')
    return { estado: 'usado', fecha: fecha || null, hora: hora ? hora.slice(0, 5) : null }
  }
  if (new Date(enlace.expira_en).getTime() <= Date.now()) return { estado: 'expirado' }

  const { data: cita, error: errorCita } = await db
    .from('citas')
    .select('id, paciente_id, profesional_id, inicio, fin, estado, pacientes(nombre)')
    .eq('id', enlace.cita_id)
    .maybeSingle<CitaEnlace>()
  if (errorCita) throw errorCita

  // Mismas reglas que confirmar_reagendamiento: si la cita cambió, el enlace deja de valer
  if (
    !cita ||
    !mismoInstante(cita.inicio, enlace.inicio_original) ||
    !mismoInstante(cita.fin, enlace.fin_original) ||
    enAtencion(cita.estado) ||
    (cita.estado === 'cancelada' && enlace.estado_original !== 'cancelada')
  ) {
    return { estado: 'no_valido' }
  }

  const { data: profesional, error: errorProfesional } = await db
    .from('profesionales')
    .select('id, nombre, apellido')
    .eq('user_id', cita.profesional_id)
    .maybeSingle<Profesional>()
  if (errorProfesional) throw errorProfesional
  if (!profesional) return { estado: 'no_valido' }

  const paciente = Array.isArray(cita.pacientes) ? cita.pacientes[0] : cita.pacientes
  const duracion = Math.round((new Date(cita.fin).getTime() - new Date(cita.inicio).getTime()) / 60000)

  return { estado: 'activo', cita, profesional, duracion, nombrePaciente: primerNombre(paciente?.nombre) }
}

// Supabase entrega máximo 1.000 filas por consulta: con más, una hora ocupada podría salir libre
async function todasLasCitas(columna: 'profesional_id' | 'paciente_id', id: string, desde: string, hasta: string, excluirId: string) {
  const db = admin()
  const filas: FilaCita[] = []
  for (let desdeFila = 0; ; desdeFila += LIMITE_FILAS) {
    const { data, error } = await db
      .from('citas')
      .select('id, inicio, fin')
      .eq(columna, id)
      .neq('id', excluirId)
      .neq('estado', 'cancelada')
      .gte('inicio', `${desde}T00:00:00`)
      .lte('inicio', `${hasta}T23:59:59`)
      .order('id')
      .range(desdeFila, desdeFila + LIMITE_FILAS - 1)
    if (error) throw error
    filas.push(...(data || []))
    if (!data || data.length < LIMITE_FILAS) return filas
  }
}

export async function calcularDisponibilidad(cita: CitaEnlace, profesional: Profesional, duracion: number): Promise<DiaConHorarios[]> {
  const db = admin()
  const { fecha: hoy, minutos } = ahoraEnClinica()
  const hasta = sumarDias(hoy, HORIZONTE_DIAS)

  const [disponibilidad, bloqueos, citasProfesional, otrasCitasPaciente] = await Promise.all([
    db.from('disponibilidad_profesional')
      .select('dia_semana, fecha_especifica, hora_inicio, hora_fin')
      .eq('profesional_id', cita.profesional_id),
    // bloqueos_agenda se relaciona con profesionales.id; citas y disponibilidad con el user_id
    db.from('bloqueos_agenda')
      .select('fecha, hora_inicio, hora_fin')
      .eq('profesional_id', profesional.id)
      .gte('fecha', hoy)
      .lte('fecha', hasta),
    todasLasCitas('profesional_id', cita.profesional_id, hoy, hasta, cita.id),
    todasLasCitas('paciente_id', cita.paciente_id, hoy, hasta, cita.id),
  ])
  if (disponibilidad.error) throw disponibilidad.error
  if (bloqueos.error) throw bloqueos.error

  return construirDias({
    hoy,
    minutosAhora: minutos,
    duracion,
    disponibilidad: disponibilidad.data || [],
    bloqueos: bloqueos.data || [],
    citasProfesional,
    otrasCitasPaciente,
    inicioOriginal: cita.inicio,
  })
}

export async function confirmarReagendamiento(token: string, fecha: string, hora: string) {
  const { data, error } = await admin().rpc('confirmar_reagendamiento', {
    p_token_hash: hashToken(token),
    p_inicio: `${fecha}T${hora}:00`,
  })
  if (error) throw error
  return data as { ok: true } | { ok: false; codigo: 'invalido' | 'usado' | 'expirado' | 'ocupado' | 'paciente_ocupado' }
}
