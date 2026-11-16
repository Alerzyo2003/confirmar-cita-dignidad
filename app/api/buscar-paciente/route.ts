import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buscarPacientePorRut, rutParaGuardar } from '@/lib/rutPacientes'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)


// Un paciente "tiene tratamientos" si tiene algún presupuesto aprobado
// o alguna atención ya realizada. Si la consulta falla, no bloqueamos el agendamiento.
async function pacienteTieneTratamientos(pacienteId: string): Promise<boolean> {
  try {
    const [presupuestos, atenciones] = await Promise.all([
      supabaseAdmin
        .from('presupuestos')
        .select('id', { count: 'exact', head: true })
        .eq('paciente_id', pacienteId)
        .eq('aprobado', true),
      supabaseAdmin
        .from('atenciones_realizadas')
        .select('id', { count: 'exact', head: true })
        .eq('paciente_id', pacienteId),
    ])
    return (presupuestos.count ?? 0) > 0 || (atenciones.count ?? 0) > 0
  } catch (err) {
    console.error('Error al revisar tratamientos del paciente:', err)
    return false
  }
}

export async function POST(req: Request) {
  try {
    const { valor, esOtroDocumento } = await req.json()

    if (!valor || !valor.trim()) {
      return NextResponse.json({ error: 'Debes ingresar tu documento' }, { status: 400 })
    }

    const rutBuscado = esOtroDocumento ? valor.trim() : rutParaGuardar(valor.trim())

    // El RUT se reconoce aunque en la base esté guardado con o sin puntos/guion
    let data: any = null
    try {
      if (esOtroDocumento) {
        const r = await supabaseAdmin.from('pacientes')
          .select('id, nombre, apellido, rut, telefono, activo, motivo_deshabilitado')
          .eq('rut', rutBuscado).maybeSingle()
        if (r.error) throw r.error
        data = r.data
      } else {
        data = await buscarPacientePorRut(supabaseAdmin, rutBuscado, 'id, nombre, apellido, telefono, activo, motivo_deshabilitado')
        if (data) delete data.created_at
      }
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // ¿El paciente ya tiene historial de tratamientos en la clínica?
    // Solo devolvemos un booleano: nunca exponemos detalles clínicos en esta ruta pública.
    let tieneTratamientos = false
    if (data?.id) {
      tieneTratamientos = await pacienteTieneTratamientos(data.id)
    }

    return NextResponse.json({ paciente: data, rutBuscado, tieneTratamientos })
  } catch (error) {
    console.error("Error al buscar paciente:", error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
