import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { withChaos } from '@/lib/utils/chaosMiddleware'

export function middleware(req: NextRequest) {
  let res = NextResponse.next()

  // Inject chaos if configured
  res = withChaos(req, res)

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
