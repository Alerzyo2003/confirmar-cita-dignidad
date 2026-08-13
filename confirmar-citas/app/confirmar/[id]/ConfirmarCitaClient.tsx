'use client'
import { useState } from 'react'
import { CheckCircle2, CalendarDays, Loader2 } from 'lucide-react'

export default function ConfirmarCitaClient({ cita }: { cita: any }) {
  const [confirmado, setConfirmado] = useState(cita.estado === 'confirmado_tel')
  const [yaVencida] = useState(['cancelada', 'atendido', 'no_asiste'].includes(cita.estado))
  const [loading, setLoading] = useState(false)

  const fecha = new Date(cita.inicio).toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
  const hora = new Date(cita.inicio).toLocaleTimeString('es-CL', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Santiago'
  })

  const confirmar = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/confirmar-cita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ citaId: cita.id })
      })
      if (!res.ok) throw new Error()
      setConfirmado(true)
    } catch {
      alert('No pudimos confirmar tu cita, intenta de nuevo o contacta a la clínica.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FBF8F2] flex items-center justify-center p-6">
      <div className="bg-white max-w-sm w-full rounded-[2.5rem] shadow-xl p-8 text-center space-y-6">
        <CalendarDays className="mx-auto text-[#C9A24B]" size={48} />
        <h1 className="text-xl font-black uppercase text-slate-800">
          Hola {cita.pacientes?.nombre}
        </h1>
        <p className="text-sm text-slate-500 font-semibold">
          Tu cita es el <span className="font-black text-slate-800 capitalize">{fecha}</span> a las{' '}
          <span className="font-black text-slate-800">{hora} hrs</span>
        </p>

        {yaVencida ? (
          <p className="text-sm font-bold text-slate-400">Esta cita ya no está vigente.</p>
        ) : confirmado ? (
          <div className="text-emerald-600 flex flex-col items-center gap-2">
            <CheckCircle2 size={40} />
            <p className="font-black uppercase text-sm">¡Cita confirmada!</p>
          </div>
        ) : (
          <button
            onClick={confirmar}
            disabled={loading}
            className="w-full py-4 bg-[#C9A24B] rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-md hover:bg-[#B38D3A] transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Confirmar mi asistencia'}
          </button>
        )}
      </div>
    </div>
  )
}