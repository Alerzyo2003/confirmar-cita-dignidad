import { NextResponse } from 'next/server'
import type { DiaConHorarios } from '@/lib/reagendamiento/horarios'
import { calcularDisponibilidad, cargarEnlace, confirmarReagendamiento } from '@/lib/reagendamiento/servidor'

export const dynamic = 'force-dynamic'

type Contexto = { params: Promise<{ token: string }> }

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/
const FORMATO_HORA = /^\d{2}:\d{2}$/

// El paciente solo recibe lo que necesita ver: nunca la agenda de otros pacientes
function diasParaPaciente(dias: DiaConHorarios[]) {
  return dias.map((d) => ({
    ...d,
    horarios: d.horarios.map(({ hora, recomendado }) => ({ hora, recomendado })),
  }))
}

export async function GET(_req: Request, { params }: Contexto) {
  try {
    const { token } = await params
    const enlace = await cargarEnlace(token)
    if (enlace.estado !== 'activo') return NextResponse.json(enlace)

    const { cita, profesional, duracion, nombrePaciente } = enlace
    const dias = await calcularDisponibilidad(cita, profesional, duracion)

    return NextResponse.json({
      estado: 'activo',
      paciente: nombrePaciente,
      profesional: `${profesional.nombre} ${profesional.apellido}`,
      citaActual: { fecha: cita.inicio.slice(0, 10), hora: cita.inicio.slice(11, 16), duracion },
      dias: diasParaPaciente(dias),
    })
  } catch (error) {
    console.error('Error al cargar el reagendamiento:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: Contexto) {
  try {
    const { token } = await params
    const { fecha, hora } = await req.json()
    if (typeof fecha !== 'string' || !FORMATO_FECHA.test(fecha) || typeof hora !== 'string' || !FORMATO_HORA.test(hora)) {
      return NextResponse.json({ error: 'Datos no válidos' }, { status: 400 })
    }

    const enlace = await cargarEnlace(token)
    if (enlace.estado !== 'activo') return NextResponse.json({ codigo: enlace.estado }, { status: 410 })

    // Se recalcula aquí: el navegador no puede pedir una hora que el sistema no ofrecería
    const dias = await calcularDisponibilidad(enlace.cita, enlace.profesional, enlace.duracion)
    const horaDisponible = dias.find((d) => d.fecha === fecha)?.horarios.some((h) => h.hora === hora)
    if (!horaDisponible) {
      return NextResponse.json({ codigo: 'ocupado', dias: diasParaPaciente(dias) }, { status: 409 })
    }

    const resultado = await confirmarReagendamiento(token, fecha, hora)
    if (resultado.ok) return NextResponse.json({ ok: true, fecha, hora })

    if (resultado.codigo === 'ocupado' || resultado.codigo === 'paciente_ocupado') {
      const actualizados = await calcularDisponibilidad(enlace.cita, enlace.profesional, enlace.duracion)
      return NextResponse.json({ codigo: resultado.codigo, dias: diasParaPaciente(actualizados) }, { status: 409 })
    }
    return NextResponse.json({ codigo: resultado.codigo }, { status: 410 })
  } catch (error) {
    console.error('Error al reagendar:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
