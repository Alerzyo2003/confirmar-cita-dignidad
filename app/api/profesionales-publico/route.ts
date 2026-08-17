import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const especialidadId = searchParams.get('especialidadId')

  let query = supabaseAdmin
    .from('profesionales')
    .select('id, user_id, nombre, apellido, especialidades(nombre)')
    .eq('activo', true)

  if (especialidadId) query = query.eq('especialidad_id', especialidadId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const normalizado = (data || []).map((p: any) => ({
    id: p.id,
    user_id: p.user_id,
    nombre: p.nombre,
    apellido: p.apellido,
    especialidades: Array.isArray(p.especialidades)
      ? p.especialidades.map((e: any) => e.nombre)
      : p.especialidades ? [p.especialidades.nombre] : []
  }))

  return NextResponse.json(normalizado)
}