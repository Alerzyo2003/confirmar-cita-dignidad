// Reconocer un RUT sin importar cómo esté escrito: "20.200.200-2", "20200200-2" y "202002002" son el mismo.
// En la base hay fichas guardadas con y sin guion, así que no basta comparar el texto exacto.
import type { SupabaseClient } from '@supabase/supabase-js'

export const limpiarRut = (valor?: string | null) =>
  (valor || '').toUpperCase().replace(/[^0-9K]/g, '').replace(/^0+/, '')

// Forma en que se guarda: 12345678-9
export const rutParaGuardar = (valor?: string | null) => {
  const l = limpiarRut(valor)
  return l.length < 2 ? l : `${l.slice(0, -1)}-${l.slice(-1)}`
}

const expresionBusqueda = (limpio: string) =>
  '^[0. -]*' + limpio.split('').map(c => (c === 'K' ? '[kK]' : c)).join('[. -]*') + '[. ]*$'

// Devuelve la ficha (la más antigua si hubiera varias) que tiene ese RUT, o null
export async function buscarPacientePorRut<T = any>(supabase: SupabaseClient, valor: string, columnas: string): Promise<T | null> {
  const limpio = limpiarRut(valor)
  if (limpio.length < 2 || !/^\d+[0-9K]$/.test(limpio)) return null
  const { data, error } = await supabase
    .from('pacientes')
    .select(`${columnas}, rut, created_at`)
    .filter('rut', 'imatch', expresionBusqueda(limpio))
    .order('created_at', { ascending: true })
    .limit(10)
  if (error) throw error
  const iguales = (data || []).filter((p: any) => limpiarRut(p.rut) === limpio)
  return (iguales[0] as T) || null
}
