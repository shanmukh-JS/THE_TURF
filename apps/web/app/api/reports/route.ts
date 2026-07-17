import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: userData, error: authError } = await supabase.auth.getUser()

    if (authError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = userData.user.id
    const body = await req.json()
    const { venueId, ownerId, category, complaint } = body

    if (!venueId || !category || !complaint) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (complaint.length < 10) {
      return NextResponse.json(
        { error: 'Please provide more details in your complaint (minimum 10 characters).' },
        { status: 400 }
      )
    }

    // Determine priority based on category
    let priority = 'LOW'
    const highPriorityCategories = ['Fraud / Fake Turf', 'Safety Hazard', 'Hostile Behaviour']
    const mediumPriorityCategories = ['Overcharging', 'Cancellation Issue', 'Double Booking']

    if (highPriorityCategories.includes(category)) {
      priority = 'HIGH'
    } else if (mediumPriorityCategories.includes(category)) {
      priority = 'MEDIUM'
    }

    // Insert into reports table
    const { error } = await supabase.from('reports').insert({
      reporter_id: userId,
      venue_id: venueId,
      owner_id: ownerId || null,
      category,
      priority,
      complaint,
      status: 'PENDING',
    })

    if (error) {
      console.error('Error submitting report:', error)
      return NextResponse.json(
        { error: `Failed to submit report: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
