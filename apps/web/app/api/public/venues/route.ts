import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const adminClient = createAdminClient()

    // 1. One-time self-healing sync: disable any venues belonging to suspended owners
    try {
      const { data: suspendedOwners } = await adminClient
        .from('users')
        .select('id, owner_profiles(id)')
        .eq('is_suspended', true)

      if (suspendedOwners && suspendedOwners.length > 0) {
        const ownerProfileIds: string[] = []
        for (const u of suspendedOwners) {
          const profs = Array.isArray(u.owner_profiles) ? u.owner_profiles : [u.owner_profiles]
          for (const p of profs) {
            if (p?.id) ownerProfileIds.push(p.id)
          }
        }

        if (ownerProfileIds.length > 0) {
          await adminClient
            .from('venues')
            .update({ is_disabled: true, verification_status: 'SUSPENDED' })
            .in('owner_id', ownerProfileIds)
            .neq('is_disabled', true)
        }
      }
    } catch (syncErr) {
      console.warn('Suspended venue sync error:', syncErr)
    }

    // 2. Fetch approved and active venues
    const { data: venues, error } = await adminClient
      .from('venues')
      .select(
        `
        *,
        city:cities(name),
        area:areas(name),
        venue_pricing(price),
        venue_images(url, is_cover),
        slots(id, status, date, start_time, end_time),
        reviews(rating),
        owner_profiles(
          id,
          user_id,
          full_name,
          business_name,
          users(is_suspended)
        )
      `
      )
      .eq('verification_status', 'APPROVED')
      .eq('is_disabled', false)
      .order('id', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 3. Filter out any venue whose owner is suspended or venue is not approved
    const activeVenues = (venues || []).filter((v: any) => {
      const rawUsers = (v.owner_profiles as any)?.users
      const isOwnerSuspended =
        rawUsers?.is_suspended === true ||
        (Array.isArray(rawUsers) && rawUsers[0]?.is_suspended === true)
      return (
        !isOwnerSuspended &&
        !v.is_disabled &&
        v.verification_status === 'APPROVED'
      )
    })

    return NextResponse.json({ venues: activeVenues })
  } catch (err: any) {
    console.error('GET /api/public/venues error:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch venues' }, { status: 500 })
  }
}
