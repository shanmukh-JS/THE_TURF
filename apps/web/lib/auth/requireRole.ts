import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function requireRole(allowedRoles: Array<'PLAYER' | 'OWNER' | 'ADMIN'>) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }

    const adminClient = createAdminClient()
    const { data: userRecord } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userRecord || !allowedRoles.includes(userRecord.role)) {
      return {
        error: NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 }),
      }
    }

    return { user, role: userRecord.role }
  } catch (err: any) {
    return { error: NextResponse.json({ error: err.message }, { status: 500 }) }
  }
}
