import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 1. Forzamos a Next.js a que no guarde esto en caché estática
export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 2. Agregamos req: Request para asegurar que sea dinámica
export async function GET(req: Request) {
  try {
    const { data: especialidades, error: errEsp } = await supabaseAdmin
      .from('especialidades')
      .select('id, nombre')
      .order('nombre')

    if (errEsp) {
      console.error("Error en especialidades:", errEsp)
      return NextResponse.json({ error: errEsp.message }, { status: 500 })
    }

    const { data: profesionales, error: errPro } = await supabaseAdmin
      .from('profesionales')
      .select('id, especialidad_id')
      .eq('activo', true)

    if (errPro) {
      console.error("Error en profesionales (dentro de esp):", errPro)
      return NextResponse.json({ error: errPro.message }, { status: 500 })
    }

    const conteo: Record<string, number> = {}
    profesionales?.forEach(p => {
      if (p.especialidad_id) conteo[p.especialidad_id] = (conteo[p.especialidad_id] || 0) + 1
    })

    const resultado = (especialidades || []).map(e => ({
      id: e.id,
      nombre: e.nombre,
      cantidadProfesionales: conteo[e.id] || 0
    }))

    return NextResponse.json(resultado)

  } catch (error) {
    console.error("Error general en API de especialidades:", error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
