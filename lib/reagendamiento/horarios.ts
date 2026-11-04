// Disponibilidad inteligente para reagendar. Son funciones puras, sin base de datos ni
// fechas del sistema, para poder probarlas con agendas de ejemplo (ver horarios.test.ts).
//
// La idea: no se muestran todas las horas libres, sino las que dejan la agenda compacta.
// Para cada hora posible se mide cuánto tiempo libre quedaría entre ese paciente y sus
// vecinos del mismo día, descontando colación, bloqueos y horas fuera de la jornada:
//
//   - Con citas antes y después: la hora debe quedar pegada a una de las dos.
//     Así se aprovecha el hueco que ya existe sin partirlo en dos.
//   - Con citas solo antes o solo después: debe quedar pegada a ese grupo de citas.
//     Tomar 14:00 si la última cita termina a las 09:00 crearía el hueco que queremos evitar.
//   - Día sin citas: solo al inicio o al final de la jornada.
//
// "Pegada" admite un margen pequeño (HUECO_TOLERADO_MIN). Una hora libre que no deje
// la agenda ordenada no se muestra. Si en un día ninguna cumple, se ofrece la menos mala
// para no perder un día que sí tiene disponibilidad real.

export const PASO_MIN = 15
export const HUECO_TOLERADO_MIN = 30
export const ANTICIPACION_MINIMA_MIN = 120
export const HORIZONTE_DIAS = 45

const PUNTAJE_RECOMENDADO = 80

export type Intervalo = { inicio: number; fin: number }

export type Horario = {
  inicio: number
  hora: string
  recomendado: boolean
}

export type DiaConHorarios = {
  fecha: string
  diaNombre: string
  diaNumero: number
  mes: string
  recomendado: boolean
  horarios: Horario[]
}

export type FilaDisponibilidad = {
  dia_semana: number | null
  fecha_especifica: string | null
  hora_inicio: string | null
  hora_fin: string | null
}

export type FilaBloqueo = {
  fecha: string
  hora_inicio: string | null
  hora_fin: string | null
}

export type FilaCita = { inicio: string; fin: string }

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

export function aHora(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
}

// Las citas se guardan como hora local de la clínica, sin zona: se leen como texto
function partesFecha(valor: string): { fecha: string; minutos: number } {
  const [fecha, hora] = valor.replace(' ', 'T').split('T')
  return { fecha, minutos: aMinutos(hora.slice(0, 5)) }
}

function fechaUTC(fecha: string): Date {
  return new Date(`${fecha}T12:00:00Z`)
}

export function sumarDias(fecha: string, dias: number): string {
  const d = fechaUTC(fecha)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

// Une intervalos que se tocan o se cruzan (por ejemplo, dos bloques de box o un sobrecupo)
export function fusionar(intervalos: Intervalo[]): Intervalo[] {
  const ordenados = intervalos.filter((i) => i.fin > i.inicio).sort((a, b) => a.inicio - b.inicio)
  const resultado: Intervalo[] = []
  for (const actual of ordenados) {
    const ultimo = resultado[resultado.length - 1]
    if (ultimo && actual.inicio <= ultimo.fin) ultimo.fin = Math.max(ultimo.fin, actual.fin)
    else resultado.push({ ...actual })
  }
  return resultado
}

function restar(base: Intervalo[], quitar: Intervalo[]): Intervalo[] {
  return quitar.reduce<Intervalo[]>((tramos, q) => tramos.flatMap((t) => {
    if (q.fin <= t.inicio || q.inicio >= t.fin) return [t]
    return [
      { inicio: t.inicio, fin: Math.min(t.fin, q.inicio) },
      { inicio: Math.max(t.inicio, q.fin), fin: t.fin },
    ].filter((i) => i.fin > i.inicio)
  }), base)
}

function minutosLibresEntre(libres: Intervalo[], desde: number, hasta: number): number {
  return libres.reduce((total, l) => total + Math.max(0, Math.min(l.fin, hasta) - Math.max(l.inicio, desde)), 0)
}

type Evaluacion = { admisible: boolean; penalizacion: number; puntaje: number }

function evaluar(inicio: number, fin: number, libres: Intervalo[], citas: Intervalo[], ventana: Intervalo): Evaluacion {
  const anterior = [...citas].reverse().find((c) => c.fin <= inicio)
  const siguiente = citas.find((c) => c.inicio >= fin)
  const antes = anterior ? minutosLibresEntre(libres, anterior.fin, inicio) : 0
  const despues = siguiente ? minutosLibresEntre(libres, fin, siguiente.inicio) : 0

  if (anterior && siguiente) {
    const penalizacion = Math.min(antes, despues)
    const puntaje = antes === 0 && despues === 0 ? 100 : penalizacion === 0 ? 90 : 60 - penalizacion
    return { admisible: penalizacion <= HUECO_TOLERADO_MIN, penalizacion, puntaje }
  }

  if (anterior || siguiente) {
    const penalizacion = anterior ? antes : despues
    return { admisible: penalizacion <= HUECO_TOLERADO_MIN, penalizacion, puntaje: penalizacion === 0 ? PUNTAJE_RECOMENDADO : 60 - penalizacion }
  }

  // Día sin citas: se puede abrir por el inicio o por el final de la jornada
  const penalizacion = Math.min(inicio - ventana.inicio, ventana.fin - fin)
  return { admisible: penalizacion === 0, penalizacion, puntaje: inicio === ventana.inicio ? 40 : 35 }
}

export function calcularHorariosDia({
  jornada,
  citas,
  bloqueos = [],
  duracion,
  minimoInicio = 0,
}: {
  jornada: Intervalo[]
  citas: Intervalo[]
  bloqueos?: Intervalo[]
  duracion: number
  minimoInicio?: number
}): Horario[] {
  const citasDia = fusionar(citas)
  const pasado = minimoInicio > 0 ? [{ inicio: 0, fin: minimoInicio }] : []
  const libres = restar(restar(fusionar(jornada), fusionar([...bloqueos, ...pasado])), citasDia)

  const posibles: (Evaluacion & { inicio: number })[] = []
  for (const ventana of libres) {
    const ultimoInicio = ventana.fin - duracion
    if (ultimoInicio < ventana.inicio) continue

    // Los bordes siempre se evalúan: son las horas pegadas a una cita o a la jornada
    const inicios = new Set([ventana.inicio, ultimoInicio])
    for (let m = Math.ceil(ventana.inicio / PASO_MIN) * PASO_MIN; m <= ultimoInicio; m += PASO_MIN) inicios.add(m)

    for (const inicio of inicios) {
      posibles.push({ inicio, ...evaluar(inicio, inicio + duracion, libres, citasDia, ventana) })
    }
  }

  const admisibles = posibles.filter((p) => p.admisible)
  const elegidos = admisibles.length > 0
    ? admisibles
    : posibles.sort((a, b) => a.penalizacion - b.penalizacion || a.inicio - b.inicio).slice(0, 1)

  return elegidos
    .sort((a, b) => a.inicio - b.inicio)
    .map((p) => ({ inicio: p.inicio, hora: aHora(p.inicio), recomendado: p.admisible && p.puntaje >= PUNTAJE_RECOMENDADO }))
}

// Un bloque con fecha específica reemplaza el horario semanal de ese día, igual que en la agenda de recepción
function jornadaDelDia(disponibilidad: FilaDisponibilidad[], fecha: string): Intervalo[] {
  const especiales = disponibilidad.filter((d) => d.fecha_especifica === fecha)
  const diaSemana = fechaUTC(fecha).getUTCDay()
  const bloques = especiales.length > 0
    ? especiales
    : disponibilidad.filter((d) => !d.fecha_especifica && d.dia_semana === diaSemana)

  return bloques
    .filter((d) => d.hora_inicio && d.hora_fin)
    .map((d) => ({ inicio: aMinutos(d.hora_inicio!), fin: aMinutos(d.hora_fin!) }))
}

function intervalosDelDia(citas: FilaCita[], fecha: string): Intervalo[] {
  return citas.flatMap((c) => {
    const inicio = partesFecha(c.inicio)
    if (inicio.fecha !== fecha) return []
    return [{ inicio: inicio.minutos, fin: partesFecha(c.fin).minutos }]
  })
}

export function construirDias({
  hoy,
  minutosAhora,
  duracion,
  disponibilidad,
  bloqueos,
  citasProfesional,
  otrasCitasPaciente,
  inicioOriginal,
  horizonteDias = HORIZONTE_DIAS,
}: {
  hoy: string
  minutosAhora: number
  duracion: number
  disponibilidad: FilaDisponibilidad[]
  bloqueos: FilaBloqueo[]
  citasProfesional: FilaCita[]        // sin la cita que se está reagendando
  otrasCitasPaciente: FilaCita[]      // con otros profesionales: no puede estar en dos partes
  inicioOriginal: string
  horizonteDias?: number
}): DiaConHorarios[] {
  const original = partesFecha(inicioOriginal)
  const dias: DiaConHorarios[] = []

  for (let i = 0; i < horizonteDias; i++) {
    const fecha = sumarDias(hoy, i)
    const jornada = jornadaDelDia(disponibilidad, fecha)
    if (jornada.length === 0) continue

    const bloqueosDia = bloqueos.filter((b) => b.fecha === fecha)
    if (bloqueosDia.some((b) => !b.hora_inicio || !b.hora_fin)) continue

    const horarios = calcularHorariosDia({
      jornada,
      duracion,
      citas: intervalosDelDia(citasProfesional, fecha),
      bloqueos: [
        ...bloqueosDia.map((b) => ({ inicio: aMinutos(b.hora_inicio!), fin: aMinutos(b.hora_fin!) })),
        ...intervalosDelDia(otrasCitasPaciente, fecha),
      ],
      minimoInicio: i === 0 ? minutosAhora + ANTICIPACION_MINIMA_MIN : 0,
    }).filter((h) => !(fecha === original.fecha && h.inicio === original.minutos))

    if (horarios.length === 0) continue

    const d = fechaUTC(fecha)
    dias.push({
      fecha,
      diaNombre: DIAS[d.getUTCDay()],
      diaNumero: d.getUTCDate(),
      mes: MESES[d.getUTCMonth()],
      recomendado: horarios.some((h) => h.recomendado),
      horarios,
    })
  }

  return dias
}
