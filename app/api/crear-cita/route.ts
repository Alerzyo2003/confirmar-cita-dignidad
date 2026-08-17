import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { pacienteId, profesionalId, fecha, hora } = await req.json()

    if (!pacienteId || !profesionalId || !fecha || !hora) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    // 1. Armar la hora de inicio exacta (ej: 2026-08-20T09:15:00)
    const inicioTimestamp = `${fecha}T${hora}:00`

    // 2. Calcular la hora de fin (15 minutos después para evaluaciones)
    const [h, m] = hora.split(':').map(Number)
    const finDate = new Date(0, 0, 0, h, m + 15)
    const finHora = `${String(finDate.getHours()).padStart(2, '0')}:${String(finDate.getMinutes()).padStart(2, '0')}:00`
    const finTimestamp = `${fecha}T${finHora}`

    // 3. Insertar en la base de datos
    const { data, error } = await supabaseAdmin
      .from('citas')
      .insert({
        paciente_id: pacienteId,
        profesional_id: profesionalId,
        inicio: inicioTimestamp,
        fin: finTimestamp,
        motivo: 'Evaluación (Agendamiento Online)',
        estado: 'programada',
        estado_confirmacion: 'pendiente'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, cita: data })

  } catch (error: any) {
    console.error("Error al agendar:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}