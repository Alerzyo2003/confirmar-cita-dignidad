import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function formatearRutChileno(valor: string): string {
  if (!valor) return ''
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

    const { pacienteId, pacienteNuevo, profesionalId, fecha, hora, esOtroDocumento } = await req.json()

    // Verificamos que envíen al menos un ID existente o los datos del paciente nuevo
    if ((!pacienteId && !pacienteNuevo) || !profesionalId || !fecha || !hora) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    let finalPacienteId = pacienteId;

    // 🛑 1. SI ES PACIENTE NUEVO, LO CREAMOS PRIMERO
    if (!finalPacienteId && pacienteNuevo) {
       const rutFinal = esOtroDocumento ? pacienteNuevo.rut.trim() : formatearRutChileno(pacienteNuevo.rut.trim());
       
       // Buscar si el paciente ya existe (evita el error 23505)
       const { data: pacienteExistente } = await supabaseAdmin
         .from('pacientes')
         .select('id')
         .eq('rut', rutFinal)
         .single();

       if (pacienteExistente) {
           finalPacienteId = pacienteExistente.id;
       } else {
           // Insertar paciente nuevo usando Service Role para ignorar RLS
           const { data: pData, error: pError } = await supabaseAdmin.from('pacientes').insert([{
               nombre: pacienteNuevo.nombre.toUpperCase().trim(),
               apellido: pacienteNuevo.apellido.toUpperCase().trim(),
               rut: rutFinal,
               telefono: pacienteNuevo.telefono,
               email: pacienteNuevo.email,
               extranjero: esOtroDocumento,
               activo: true
           }]).select('id').single();

           if (pError) {
              console.error("Error BD al insertar paciente:", pError);
              throw new Error("No se pudo registrar al paciente en la base de datos.");
           }
           finalPacienteId = pData.id;
       }
    }

    // 2. Armar la hora de inicio exacta
    const inicioTimestamp = `${fecha}T${hora}:00`

    // 3. Calcular la hora de fin (15 minutos para agendamiento online)
    const [h, m] = hora.split(':').map(Number)
    const finDate = new Date(0, 0, 0, h, m + 15)
    const finHora = `${String(finDate.getHours()).padStart(2, '0')}:${String(finDate.getMinutes()).padStart(2, '0')}:00`
    const finTimestamp = `${fecha}T${finHora}`

    // 4. Insertar la cita asignada al paciente final (nuevo o existente)
    const { data, error } = await supabaseAdmin
      .from('citas')
      .insert({
        paciente_id: finalPacienteId,
        profesional_id: profesionalId,
        inicio: inicioTimestamp,
        fin: finTimestamp,
        motivo: 'Evaluación (Agendamiento Online)',
        estado: 'programada',
        estado_confirmacion: 'pendiente' 
      })
      .select()
      .single()

    if (error) {
        console.error("Error BD al insertar cita:", error);
        throw new Error("Ocurrió un error al intentar crear la cita en la agenda.");
    }

    return NextResponse.json({ success: true, cita: data })

  } catch (error: any) {
    console.error("Error al agendar:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
