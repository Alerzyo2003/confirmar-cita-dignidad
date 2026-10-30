// La tabla `profesionales` guarda una sola especialidad (especialidad_id).
// Aquí se agregan especialidades ADICIONALES para profesionales que atienden en más de un área,
// para que aparezcan al buscar por cualquiera de ellas en el agendamiento online.
//
// - `profesional`: palabras que deben aparecer en "nombre apellido" (sin tildes, da igual mayúsculas)
// - `especialidades`: parte del nombre de cada especialidad tal como está en la tabla `especialidades`

type EspecialidadExtra = { profesional: string[]; especialidades: string[] }

export const ESPECIALIDADES_EXTRA: EspecialidadExtra[] = [
  { profesional: ['victor', 'morgado'], especialidades: ['odontopediatr', 'ortodon'] },
]

export function normalizar(texto: string | null | undefined): string {
  return (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Claves de especialidad extra que corresponden a este profesional. */
function clavesExtra(nombre: string, apellido: string): string[] {
  const completo = normalizar(`${nombre} ${apellido}`)
  return ESPECIALIDADES_EXTRA
    .filter((regla) => regla.profesional.every((palabra) => completo.includes(palabra)))
    .flatMap((regla) => regla.especialidades)
}

/** ¿El profesional atiende también la especialidad con este nombre? */
export function atiendeEspecialidadExtra(nombre: string, apellido: string, nombreEspecialidad: string): boolean {
  const esp = normalizar(nombreEspecialidad)
  return clavesExtra(nombre, apellido).some((clave) => esp.includes(clave))
}

/** Nombres de las especialidades adicionales del profesional, a partir del catálogo. */
export function especialidadesExtraDe<T extends { nombre: string }>(nombre: string, apellido: string, catalogo: T[]): T[] {
  const claves = clavesExtra(nombre, apellido)
  if (claves.length === 0) return []
  return catalogo.filter((esp) => claves.some((clave) => normalizar(esp.nombre).includes(clave)))
}
