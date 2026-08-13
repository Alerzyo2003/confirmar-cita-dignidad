import { createClient } from '@supabase/supabase-js'
import ConfirmarCitaClient from './ConfirmarCitaClient'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function ConfirmarCitaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const { data: cita } = await supabaseAdmin
    .from('citas')
    .select('id, inicio, estado, motivo, pacientes(nombre, apellido)')
    .eq('id', id)
    .maybeSingle()

  if (!cita) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center bg-[#FBF8F2]">
        <p className="font-bold text-slate-600">No encontramos esta cita. Contacta a la clínica.</p>
      </div>
    )
  }

  return <ConfirmarCitaClient cita={cita} />
}
