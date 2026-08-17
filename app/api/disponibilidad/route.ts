import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function formatearFecha(date: Date) { return date.toISOString().split('T')[0] }
function timeToMins(t: string) { const [h,m] = t.split(':').map(Number); return h * 60 + m; }
function minsToTime(m: number) { return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}` }

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const profId = searchParams.get('profId')

    if (!userId || !profId) return NextResponse.json({ error: 'Faltan IDs' }, { status: 400 })

    const { data: disponibilidades } = await supabaseAdmin
      .from('disponibilidad_profesional')
      .select('*')
      .eq('profesional_id', userId)

    // Modificado: Ahora traemos estado_confirmacion y motivo
    const { data: citas } = await supabaseAdmin
      .from('citas')
      .select('inicio, fin, estado, estado_confirmacion, motivo')
      .eq('profesional_id', userId)
      .gte('inicio', formatearFecha(new Date()))
      .neq('estado', 'cancelada')

    const { data: bloqueos } = await supabaseAdmin
      .from('bloqueos_agenda')
      .select('*')
      .eq('profesional_id', profId)
      .gte('fecha', formatearFecha(new Date()))

    const diasDisponibles = []
    const diasNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const hoy = new Date()
    
    for (let i = 0; i < 30; i++) {
      const fechaActual = new Date()
      fechaActual.setDate(hoy.getDate() + i)
      
      const fechaStr = formatearFecha(fechaActual)
      const diaSemana = fechaActual.getDay()
      
      const dispDelDia = disponibilidades?.filter(d => 
        (d.fecha_especifica === fechaStr) || (!d.fecha_especifica && d.dia_semana === diaSemana)
      )

      if (!dispDelDia || dispDelDia.length === 0) continue

      let slotsDelDia: string[] = []

      for (const disp of dispDelDia) {
         if (!disp.hora_inicio || !disp.hora_fin) continue

         let minActual = timeToMins(disp.hora_inicio)
         const minFin = timeToMins(disp.hora_fin)

         while (minActual + 15 <= minFin) {
            const startSlot = minActual
            const endSlot = minActual + 15
            
            const chocaBloqueo = bloqueos?.some(b => {
               if (b.fecha !== fechaStr) return false
               if (!b.hora_inicio || !b.hora_fin) return true 
               return (startSlot < timeToMins(b.hora_fin) && endSlot > timeToMins(b.hora_inicio))
            })

            const chocaCita = citas?.some(c => {
               // 🌟 NUEVA REGLA: Si la cita es "Online" y está "pendiente", NO bloquea el horario
               if (c.estado_confirmacion === 'pendiente' && c.motivo && c.motivo.includes('Online')) return false;

               const citaFecha = c.inicio.split('T')[0]
               if (citaFecha !== fechaStr) return false
               const citaInicioMins = timeToMins(c.inicio.split('T')[1].substring(0,5))
               const citaFinMins = timeToMins(c.fin.split('T')[1].substring(0,5))
               return (startSlot < citaFinMins && endSlot > citaInicioMins)
            })

            if (!chocaBloqueo && !chocaCita) {
               if (i === 0) {
                  const ahoraMins = hoy.getHours() * 60 + hoy.getMinutes()
                  if (startSlot > ahoraMins) slotsDelDia.push(minsToTime(startSlot))
               } else {
                  slotsDelDia.push(minsToTime(startSlot))
               }
            }
            minActual += 15 
         }
      }

      if (slotsDelDia.length > 0) {
         diasDisponibles.push({
            fecha: fechaStr,
            diaNombre: diasNombres[diaSemana],
            diaNumero: fechaActual.getDate(),
            slots: [...new Set(slotsDelDia)].sort()
         })
      }
    }

    return NextResponse.json(diasDisponibles)

  } catch (error) {
    console.error("Error al calcular horarios:", error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}