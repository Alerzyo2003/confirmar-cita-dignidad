'use client'
import { useState } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import { Search, Loader2, Users, User, ChevronRight, ArrowLeft, CalendarDays, IdCard, CheckCircle } from 'lucide-react'

type Especialidad = { id: string; nombre: string; cantidadProfesionales: number }
type Profesional = { id: string; user_id: string; nombre: string; apellido: string; especialidades: string[] }
type Paciente = { id: string; nombre: string; apellido: string; rut: string; telefono: string | null; activo: boolean; motivo_deshabilitado: string | null }
type DiaDisponible = { fecha: string; diaNombre: string; diaNumero: number; slots: string[] }

// Agregamos 'exito' a los pasos
type Paso = 'inicio' | 'especialidades' | 'profesionalesPorEspecialidad' | 'profesionales' | 'documento' | 'fecha_hora' | 'exito'

export default function AgendarClient() {
  const [paso, setPaso] = useState<Paso>('inicio')
  const [cargando, setCargando] = useState(false)
  const [agendando, setAgendando] = useState(false) 
  const [error, setError] = useState('')

  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [profesionales, setProfesionales] = useState<Profesional[]>([])
  const [especialidadSeleccionada, setEspecialidadSeleccionada] = useState<Especialidad | null>(null)
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState<Profesional | null>(null)

  const [esOtroDocumento, setEsOtroDocumento] = useState(false)
  const [documento, setDocumento] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [pacienteEncontrado, setPacienteEncontrado] = useState<Paciente | null | 'no_encontrado'>(null)

  const [diasDisponibles, setDiasDisponibles] = useState<DiaDisponible[]>([])
  const [diaSeleccionado, setDiaSeleccionado] = useState<DiaDisponible | null>(null)
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null)
  const [tokenTurnstile, setTokenTurnstile] = useState<string | null>(null)

  const irAEspecialidades = async () => {
    setPaso('especialidades'); setCargando(true)
    try {
      const res = await fetch('/api/especialidades')
      if (!res.ok) throw new Error()
      setEspecialidades(await res.json())
    } catch { setEspecialidades([]) } finally { setCargando(false) }
  }

  const irAProfesionales = async () => {
    setPaso('profesionales'); setCargando(true)
    try {
      const res = await fetch('/api/profesionales-publico')
      if (!res.ok) throw new Error()
      setProfesionales(await res.json())
    } catch { setProfesionales([]) } finally { setCargando(false) }
  }

  const seleccionarEspecialidad = async (esp: Especialidad) => {
    setEspecialidadSeleccionada(esp); setPaso('profesionalesPorEspecialidad'); setCargando(true)
    try {
      const res = await fetch(`/api/profesionales-publico?especialidadId=${esp.id}`)
      if (!res.ok) throw new Error()
      setProfesionales(await res.json())
    } catch { setProfesionales([]) } finally { setCargando(false) }
  }

  const buscarPaciente = async () => {
    setError(''); if (!documento.trim()) return setError('Ingresa tu documento')
    setBuscando(true)
    try {
      const res = await fetch('/api/buscar-paciente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Eliminamos el token de aquí, el middleware de Vercel se encarga de proteger esta ruta
        body: JSON.stringify({ valor: documento, esOtroDocumento })
        
      })
      const data = await res.json()
      if (!data.paciente) setPacienteEncontrado('no_encontrado')
      else if (!data.paciente.activo) {
        setError(data.paciente.motivo_deshabilitado || 'Contacta a la clínica para habilitar tu cuenta.')
        setPacienteEncontrado(null)
      } else setPacienteEncontrado(data.paciente)
    } catch { setError('Ocurrió un error al buscar tu ficha.') } finally { setBuscando(false) }
  }

  const cargarHorarios = async () => {
    if (!profesionalSeleccionado) return;
    setPaso('fecha_hora'); setCargando(true); setHoraSeleccionada(null)
    try {
      const res = await fetch(`/api/disponibilidad?userId=${profesionalSeleccionado.user_id}&profId=${profesionalSeleccionado.id}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setDiasDisponibles(data)
      if (data.length > 0) setDiaSeleccionado(data[0])
    } catch { setError("Error al cargar los horarios.") } finally { setCargando(false) }
  }

  // --- 🌟 CORREGIDO: Confirmar Cita Real con TypeScript estricto y Token ---
  const confirmarCita = async () => {
    // Aquí está la corrección que TypeScript pedía: "pacienteEncontrado === 'no_encontrado'"
    if (!pacienteEncontrado || pacienteEncontrado === 'no_encontrado' || !profesionalSeleccionado || !diaSeleccionado || !horaSeleccionada) return;
    
    if (!tokenTurnstile) {
      setError('Por favor espera a que se valide tu conexión segura.');
      return;
    }

    setAgendando(true)
    setError('')
    
    try {
      const res = await fetch('/api/crear-cita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: pacienteEncontrado.id, // TypeScript ahora sabe que esto es seguro
          profesionalId: profesionalSeleccionado.user_id,
          fecha: diaSeleccionado.fecha,
          hora: horaSeleccionada,
          tokenTurnstile // Enviamos el token para proteger la creación
        })
      })
      
      if (!res.ok) throw new Error()
      
      setPaso('exito')
    } catch (err) {
      setError('Ocurrió un error al agendar o no superaste la validación de seguridad. Intenta de nuevo.')
    } finally {
      setAgendando(false)
    }
  }

  const volver = () => {
    setError('')
    if (paso === 'fecha_hora') { setPaso('documento') }
    else if (paso === 'documento') {
      setPacienteEncontrado(null)
      setPaso(especialidadSeleccionada ? 'profesionalesPorEspecialidad' : 'profesionales')
    } else if (paso === 'profesionalesPorEspecialidad') { setPaso('especialidades') } 
    else if (paso === 'profesionales' || paso === 'especialidades') {
      setPaso('inicio'); setEspecialidadSeleccionada(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#FBF8F2] p-6 flex flex-col items-center">
      <div className="w-full max-w-lg mt-8">

        {paso !== 'exito' && (
          <div className="flex items-center gap-3 mb-8 justify-center">
            <CalendarDays className="text-[#C9A24B]" size={28} />
            <h1 className="text-2xl font-black uppercase text-[#0A111F]">Agendar Cita</h1>
          </div>
        )}

        {paso !== 'inicio' && paso !== 'exito' && (
          <button onClick={volver} className="flex items-center gap-1 text-xs font-black uppercase text-slate-500 mb-4 hover:text-[#C9A24B] transition-colors">
            <ArrowLeft size={14} /> Volver
          </button>
        )}

        {paso === 'inicio' && (
          <div className="grid grid-cols-1 gap-4">
            <button onClick={irAEspecialidades} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-[#C9A24B] transition-all flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-xl bg-[#C9A24B]/10 flex items-center justify-center shrink-0"><Users className="text-[#C9A24B]" size={22} /></div>
              <div><p className="font-black uppercase text-slate-800">Buscar por Especialidad</p><p className="text-xs font-semibold text-slate-400 mt-1">Ej: Ortodoncia, Endodoncia...</p></div>
              <ChevronRight className="ml-auto text-slate-300" size={20} />
            </button>
            <button onClick={irAProfesionales} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-[#C9A24B] transition-all flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-xl bg-[#C9A24B]/10 flex items-center justify-center shrink-0"><User className="text-[#C9A24B]" size={22} /></div>
              <div><p className="font-black uppercase text-slate-800">Buscar por Profesional</p><p className="text-xs font-semibold text-slate-400 mt-1">Elige directamente a tu doctor/a</p></div>
              <ChevronRight className="ml-auto text-slate-300" size={20} />
            </button>
          </div>
        )}

        {paso === 'especialidades' && (
          <div className="space-y-3">
            {cargando ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
            : especialidades.map(esp => (
              <button key={esp.id} onClick={() => seleccionarEspecialidad(esp)} className="w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-[#C9A24B] transition-all flex items-center justify-between text-left">
                <span className="font-black uppercase text-sm text-slate-800">{esp.nombre}</span>
                <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">{esp.cantidadProfesionales} {esp.cantidadProfesionales === 1 ? 'doctor' : 'doctores'}</span>
              </button>
            ))}
          </div>
        )}

        {(paso === 'profesionales' || paso === 'profesionalesPorEspecialidad') && (
          <div className="space-y-3">
            {especialidadSeleccionada && <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Especialidad: <span className="text-[#C9A24B]">{especialidadSeleccionada.nombre}</span></p>}
            {cargando ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
            : profesionales.length === 0 ? <p className="text-center text-sm font-bold text-slate-400 py-12">No hay profesionales disponibles.</p>
            : profesionales.map(p => (
              <button key={p.id} onClick={() => { setProfesionalSeleccionado(p); setPaso('documento'); }} className="w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-[#C9A24B] transition-all flex items-start justify-between text-left">
                <div>
                  <p className="font-black uppercase text-sm text-slate-800">Dr. {p.nombre} {p.apellido}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {p.especialidades.length > 0 ? p.especialidades.map((esp, i) => (<span key={i} className="text-[10px] font-bold uppercase bg-[#C9A24B]/10 text-[#8A6D2F] px-2 py-1 rounded-md">{esp}</span>)) : <span className="text-[10px] font-bold text-slate-300 uppercase">Sin especialidad asignada</span>}
                  </div>
                </div>
                <ChevronRight className="text-slate-300 shrink-0 mt-1" size={20} />
              </button>
            ))}
          </div>
        )}

        {paso === 'documento' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Agendando con</p>
              <p className="font-black uppercase text-slate-800 text-base mt-1">Dr. {profesionalSeleccionado?.nombre} {profesionalSeleccionado?.apellido}</p>
            </div>

            {pacienteEncontrado && pacienteEncontrado !== 'no_encontrado' ? (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50 flex items-center gap-3">
                  <IdCard className="text-emerald-500 shrink-0" size={24} />
                  <div>
                    <p className="font-black uppercase text-sm text-emerald-800">{pacienteEncontrado.nombre} {pacienteEncontrado.apellido}</p>
                    <p className="text-xs font-bold text-emerald-500 mt-1">RUT: {pacienteEncontrado.rut}</p>
                  </div>
                </div>
                
                <button
                  onClick={cargarHorarios}
                  className="w-full py-4 bg-[#C9A24B] rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-md hover:bg-[#B38D3A] transition-all flex items-center justify-center"
                >
                  Continuar a Elegir Horario
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="otro-doc" checked={esOtroDocumento} onChange={(e) => { setEsOtroDocumento(e.target.checked); setDocumento(''); setError(''); setPacienteEncontrado(null); }} className="w-5 h-5 accent-[#C9A24B]" />
                  <label htmlFor="otro-doc" className="text-sm font-bold text-slate-600 cursor-pointer">Soy extranjero / tengo otro tipo de documento</label>
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder={esOtroDocumento ? 'Ingresa tu N° de documento' : 'Ingresa tu RUT (ej: 20791085-6)'} value={documento} onChange={(e) => { setDocumento(e.target.value); setError(''); setPacienteEncontrado(null); }} onKeyDown={(e) => e.key === 'Enter' && buscarPaciente()} className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-[#C9A24B] transition-all" />
                </div>
                {error && <p className="text-xs font-bold text-red-500">{error}</p>}
                {pacienteEncontrado === 'no_encontrado' && <p className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-xl p-3">No encontramos tu ficha. Por favor contacta a la clínica para registrarte antes de agendar online.</p>}
                <button onClick={buscarPaciente} disabled={buscando} className="w-full py-4 bg-[#C9A24B] rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-md hover:bg-[#B38D3A] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {buscando ? <Loader2 className="animate-spin" size={18} /> : 'Buscar mi ficha'}
                </button>
              </>
            )}
          </div>
        )}

        {paso === 'fecha_hora' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Paso Final</p>
              <h2 className="font-black uppercase text-slate-800 text-lg mt-1">Elige un día y hora</h2>
              <p className="text-sm font-semibold text-slate-500 mt-1">Con Dr. {profesionalSeleccionado?.nombre} {profesionalSeleccionado?.apellido}</p>
            </div>

            {error && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>}

            {cargando ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3"><Loader2 className="animate-spin text-[#C9A24B]" size={32} /><p className="text-sm font-bold text-slate-400">Buscando horas libres...</p></div>
            ) : diasDisponibles.length === 0 ? (
               <div className="text-center p-6 border border-slate-100 bg-slate-50 rounded-2xl"><p className="text-sm font-bold text-slate-600">Este profesional no tiene horas disponibles en los próximos 30 días.</p></div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-700">Días Disponibles:</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
                  {diasDisponibles.map(dia => {
                    const seleccionado = diaSeleccionado?.fecha === dia.fecha
                    return (
                      <button key={dia.fecha} onClick={() => { setDiaSeleccionado(dia); setHoraSeleccionada(null) }} className={`snap-start flex-shrink-0 w-16 h-20 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${seleccionado ? 'border-[#C9A24B] bg-[#C9A24B]/10' : 'border-slate-200 bg-slate-50 hover:border-[#C9A24B]'}`}>
                        <span className={`text-xs font-bold uppercase ${seleccionado ? 'text-[#C9A24B]' : 'text-slate-400'}`}>{dia.diaNombre}</span>
                        <span className={`text-lg font-black ${seleccionado ? 'text-[#8A6D2F]' : 'text-slate-700'}`}>{dia.diaNumero}</span>
                      </button>
                    )
                  })}
                </div>

                {diaSeleccionado && (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-sm font-bold text-slate-700 mb-3">Horas Disponibles ({diaSeleccionado.fecha}):</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                      {diaSeleccionado.slots.map(hora => {
                        const seleccionada = horaSeleccionada === hora
                        return (
                          <button key={hora} onClick={() => setHoraSeleccionada(hora)} className={`py-2 px-1 rounded-lg border text-sm font-bold transition-all ${seleccionada ? 'bg-[#C9A24B] border-[#C9A24B] text-white' : 'border-slate-200 text-slate-600 bg-white hover:border-[#C9A24B] hover:text-[#C9A24B]'}`}>
                            {hora}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-center my-4">
                  <Turnstile
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                    onSuccess={(token) => setTokenTurnstile(token)}
                  />
                </div>

                {/* 🌟 BOTÓN DE CONFIRMAR REAL 🌟 */}
                <button 
                  disabled={!horaSeleccionada || agendando || !tokenTurnstile}
                  onClick={confirmarCita}
                  className="w-full py-4 bg-emerald-500 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-md hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {agendando ? <Loader2 className="animate-spin" size={18} /> : 'Confirmar Evaluación'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 🌟 PASO 5: Éxito 🌟 */}
        {paso === 'exito' && (
          <div className="bg-white p-8 rounded-3xl border border-emerald-100 shadow-lg text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="text-emerald-500" size={40} />
            </div>
            
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-wide">¡Cita Confirmada!</h2>
              <p className="text-sm font-semibold text-slate-500 mt-2">
                Tu evaluación presencial ha sido agendada con éxito.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Profesional</p>
                <p className="text-sm font-black text-slate-800 uppercase">Dr. {profesionalSeleccionado?.nombre} {profesionalSeleccionado?.apellido}</p>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-between">
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fecha</p>
                  <p className="text-sm font-black text-slate-800">{diaSeleccionado?.fecha}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hora</p>
                  <p className="text-sm font-black text-[#C9A24B]">{horaSeleccionada}</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => window.location.reload()} 
              className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest underline"
            >
              Agendar otra cita / Volver al inicio
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
