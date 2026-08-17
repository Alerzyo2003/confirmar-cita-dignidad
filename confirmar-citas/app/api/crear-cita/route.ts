import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Función que valida que el usuario no es un Robot usando Cloudflare
async function validarTurnstile(token: string) {
  // Si no has configurado tu Secret Key, asume que es verdadero (para que no te bloquee probando en local)
  if (!process.env.TURNSTILE_SECRET_KEY) return true; 
  
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${process.env.TURNSTILE_SECRET_KEY}&response=${token}`
  })
  const data = await res.json()
  return data.success
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Nota que recibimos el tokenTurnstile desde el cliente
    const { pacienteId, profesionalId, fecha, hora, tokenTurnstile } = await req.json()

    if (!pacienteId || !profesionalId || !fecha || !hora) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    // 🛑 1. VALIDACIÓN ANTI-SPAM DE CLOUDFLARE
    if (tokenTurnstile) {
        const esHumano = await validarTurnstile(tokenTurnstile)
        if (!esHumano) {
            return NextResponse.json({ error: 'Validación de seguridad fallida' }, { status: 403 })
        }
    } else {
        // Si no mandan token, rechazamos la petición por seguridad
        return NextResponse.json({ error: 'Token de seguridad requerido' }, { status: 403 })
    }

    // 2. Armar la hora de inicio exacta
    const inicioTimestamp = `${fecha}T${hora}:00`

    // 3. Calcular la hora de fin (15 minutos para agendamiento online)
    const [h, m] = hora.split(':').map(Number)
    const finDate = new Date(0, 0, 0, h, m + 15)
    const finHora = `${String(finDate.getHours()).padStart(2, '0')}:${String(finDate.getMinutes()).padStart(2, '0')}:00`
    const finTimestamp = `${fecha}T${finHora}`

    // 4. Insertar en la base de datos
    const { data, error } = await supabaseAdmin
      .from('citas')
      .insert({
        paciente_id: pacienteId,
        profesional_id: profesionalId,
        inicio: inicioTimestamp,
        fin: finTimestamp,
        motivo: 'Evaluación (Agendamiento Online)',
        estado: 'programada',
        estado_confirmacion: 'pendiente' // Queda pendiente hasta que la apruebes en agenda
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
