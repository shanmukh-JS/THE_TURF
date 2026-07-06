import { createClient } from '@/lib/supabase/client'

export async function logAdminAction(
  action: string,
  targetType: string,
  targetId: string,
  reason?: string
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('admin_audit_logs').insert({
    admin_id: user.id,
    action,
    target_type: targetType,
    target_id: targetId,
    reason,
  })
}
