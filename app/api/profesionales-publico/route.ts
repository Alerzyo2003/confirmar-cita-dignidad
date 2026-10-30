import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { especialidadesExtraDe } from '@/lib/especialidadesExtra'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type FilaProfesional = {
  id: string
  user_id: string
  nombre: string
  apellido: string
  especialidad_id: string | null
  especialidades: { nombre: string } | { nombre: string }[] | null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const especialidadId = searchParams.get('especialidadId')

  // Traemos todos los activos (no filtramos por especialidad_id en la consulta) porque
  // algunos profesionales atienden especialidades adicionales definidas en lib/especialidadesExtra.ts
  const [profRes, espRes] = await Promise.all([
    supabaseAdmin
      .from('profesionales')
      .select('id, user_id, nombre, apellido, especialidad_id, especialidades(nombre)')
      .eq('activo', true),
    supabaseAdmin.from('especialidades').select('id, nombre'),
  ])

  if (profRes.error) return NextResponse.json({ error: profRes.error.message }, { status: 500 })
  if (espRes.error) return NextResponse.json({ error: espRes.error.message }, { status: 500 })

  const catalogo = espRes.data || []

  const normalizado = ((profRes.data || []) as FilaProfesional[]).map((p) => {
    const principal = Array.isArray(p.especialidades)
      ? p.especialidades.map((e) => e.nombre)
      : p.especialidades ? [p.especialidades.nombre] : []
    const extras = especialidadesExtraDe(p.nombre, p.apellido, catalogo)

    return {
      id: p.id,
      user_id: p.user_id,
      nombre: p.nombre,
      apellido: p.apellido,
      especialidadIds: Array.from(new Set([p.especialidad_id, ...extras.map((e) => e.id)].filter(Boolean))) as string[],
      especialidades: Array.from(new Set([...principal, ...extras.map((e) => e.nombre)])),
    }
  })

  const resultado = especialidadId
    ? normalizado.filter((p) => p.especialidadIds.includes(especialidadId))
    : normalizado

  return NextResponse.json(resultado.map((p) => ({
    id: p.id,
    user_id: p.user_id,
    nombre: p.nombre,
    apellido: p.apellido,
    especialidades: p.especialidades,
  })))
}
