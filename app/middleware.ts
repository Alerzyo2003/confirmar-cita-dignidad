import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Mapa temporal para guardar las IPs que se conectan (Evita DDoS y Fuerza Bruta)
const ratelimit = new Map()

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/crear-cita') || 
      request.nextUrl.pathname.startsWith('/api/buscar-paciente')) {
    
    // Obtener la IP del usuario
    const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1'

    const currentTime = Date.now()
    const limitData = ratelimit.get(ip) || { count: 0, lastRequest: currentTime }

    // Limpiar contador si ha pasado 1 minuto
    if (currentTime - limitData.lastRequest > 60000) {
      limitData.count = 0
    }

    limitData.count += 1
    limitData.lastRequest = currentTime
    ratelimit.set(ip, limitData)

    // REGLA DE ORO: Máximo 15 peticiones por minuto a la API de agendamiento
    if (limitData.count > 15) {
      return new NextResponse(
        JSON.stringify({ error: 'Has excedido el límite de peticiones de seguridad. Intenta en un minuto.' }),
        { 
            status: 429,
            headers: { 'content-type': 'application/json' }
        }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/crear-cita',
    '/api/buscar-paciente'
  ],
}