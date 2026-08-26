import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { citaId } = await req.json()
  if (!citaId) return NextResponse.json({ error: 'Falta citaId' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('citas')
    .update({ estado: 'confirmado_tel' })
    .eq('id', citaId)
    // 🗑️ Restricción .in() eliminada
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'No se encontró la cita' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
