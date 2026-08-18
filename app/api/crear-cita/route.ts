import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Función que valida que el usuario no es un Robot usando Cloudflare
async function validarTurnstile(token: string) {
  if (!process.env.TURNSTILE_SECRET_KEY) return true; 
  
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${process.env.TURNSTILE_SECRET_KEY}&response=${token}`
  })
  const data = await res.json()
  return data.success
}

function formatearRutChileno(valor: string): string {
  const limpio = valor.replace(/[^0-9kK]/g, '').toUpperCase()
  if (limpio.length < 2) return limpio
  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  return `${cuerpo}-${dv}`
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { pacienteId, pacienteNuevo, profesionalId, fecha, hora, tokenTurnstile, esOtroDocumento } = await req.json()

    // Verificamos que envíen al menos un ID existente o los datos del paciente nuevo
    if ((!pacienteId && !pacienteNuevo) || !profesionalId || !fecha || !hora) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    // 🛑 1. VALIDACIÓN ANTI-SPAM DE CLOUDFLARE
    if (tokenTurnstile) {
        const esHumano = await validarTurnstile(tokenTurnstile)
        if (!esHumano) {
            return NextResponse.json({ error: 'Validación de seguridad fallida' }, { status: 403 })
        }
    } else {
        return NextResponse.json({ error: 'Token de seguridad requerido' }, { status: 403 })
    }

    let finalPacienteId = pacienteId;

    // 🛑 2. SI ES PACIENTE NUEVO, LO CREAMOS PRIMERO
    if (pacienteNuevo) {
       const rutFinal = esOtroDocumento ? pacienteNuevo.rut.trim() : formatearRutChileno(pacienteNuevo.rut.trim());
       
       const { data: pData, error: pError } = await supabaseAdmin.from('pacientes').insert([{
           nombre: pacienteNuevo.nombre.toUpperCase().trim(),
           apellido: pacienteNuevo.apellido.toUpperCase().trim(),
           rut: rutFinal,
           telefono: pacienteNuevo.telefono,
           email: pacienteNuevo.email,
           activo: true
       }]).select('id').single();

       if (pError) {
          if (pError.code === '23505') { // Código de error SQL para Violación de Unicidad (RUT repetido)
             return NextResponse.json({ error: 'El documento ya está registrado. Por favor retrocede y búscalo nuevamente.' }, { status: 400 })
          }
          throw pError;
       }
       finalPacienteId = pData.id;
    }

    // 3. Armar la hora de inicio exacta
    const inicioTimestamp = `${fecha}T${hora}:00`

    // 4. Calcular la hora de fin (15 minutos para agendamiento online)
    const [h, m] = hora.split(':').map(Number)
    const finDate = new Date(0, 0, 0, h, m + 15)
    const finHora = `${String(finDate.getHours()).padStart(2, '0')}:${String(finDate.getMinutes()).padStart(2, '0')}:00`
    const finTimestamp = `${fecha}T${finHora}`

    // 5. Insertar la cita asignada al paciente final (nuevo o existente)
    const { data, error } = await supabaseAdmin
      .from('citas')
      .insert({
        paciente_id: finalPacienteId,
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
