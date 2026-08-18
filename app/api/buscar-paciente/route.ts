import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function validarTurnstile(token: string) {
  if (!process.env.TURNSTILE_SECRET_KEY) return true; 
  
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${process.env.TURNSTILE_SECRET_KEY}&response=${token}`
  })
  const data = await res.json()
  return data.success
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function formatearRutChileno(valor: string): string {
  const limpio = valor.replace(/[^0-9kK]/g, '').toUpperCase()
  if (limpio.length < 2) return limpio
  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  return `${cuerpo}-${dv}`
}

export async function POST(req: Request) {
  try {
    const { valor, esOtroDocumento, tokenTurnstile } = await req.json()

    // 🛑 VALIDACIÓN ANTI-SPAM
    if (!tokenTurnstile) {
        return NextResponse.json({ error: 'Validación de seguridad requerida' }, { status: 403 })
    }
    const esHumano = await validarTurnstile(tokenTurnstile)
    if (!esHumano) {
        return NextResponse.json({ error: 'Fallo en la validación de seguridad de Cloudflare' }, { status: 403 })
    }

    if (!valor || !valor.trim()) {
      return NextResponse.json({ error: 'Debes ingresar tu documento' }, { status: 400 })
    }

    const rutBuscado = esOtroDocumento ? valor.trim() : formatearRutChileno(valor.trim())

    const { data, error } = await supabaseAdmin
      .from('pacientes')
      .select('id, nombre, apellido, rut, telefono, activo, motivo_deshabilitado')
      .eq('rut', rutBuscado)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ paciente: data, rutBuscado })
  } catch (error) {
    console.error("Error al buscar paciente:", error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
