import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/bookings/create/route'
import { NextResponse } from 'next/server'

// Mock Supabase clients
const mockUser = { id: 'test-user-id', email: 'test@example.com' }

const mockAdminClient = {
  from: vi.fn(),
  rpc: vi.fn(),
}

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}))

describe('POST /api/bookings/create', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    const insertSpy = vi.fn().mockReturnThis()

    mockAdminClient.from.mockImplementation((table: string) => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(async () => {
          if (table === 'users') {
            return { data: { role: 'OWNER' } }
          }
          if (table === 'slots') {
            return {
              data: {
                id: 'slot-1',
                venue_id: 'venue-1',
                price: 1000,
                status: 'Available',
                venues: { owner_id: 'owner-1', name: 'Test Venue' },
              },
            }
          }
          if (table === 'bookings') {
            return { data: { id: 'booking-1', status: 'CONFIRMED' } }
          }
          if (table === 'owner_profiles') {
            return { data: { user_id: 'owner-user-1' } }
          }
          return { data: null }
        }),
        maybeSingle: vi.fn().mockImplementation(async () => {
          if (table === 'owner_settings') {
            return {
              data: { auto_accept_bookings: true, notify_bookings: false, notify_email: false },
            }
          }
          if (table === 'owner_profiles') {
            return { data: { user_id: 'owner-user-1' } }
          }
          return { data: null }
        }),
        insert: insertSpy,
        __insertSpy: insertSpy, // for tests
      }
    })

    mockAdminClient.rpc.mockResolvedValue({ data: 'booking-1', error: null })
  })

  it('should create booking with CONFIRMED status when auto_accept_bookings is true (default)', async () => {
    const req = new Request('http://localhost/api/bookings/create', {
      method: 'POST',
      body: JSON.stringify({ slotId: 'slot-1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockAdminClient.rpc).toHaveBeenCalledWith(
      'rpc_book_slot',
      expect.objectContaining({
        p_status: 'CONFIRMED',
      })
    )
  })

  it('should create booking with PENDING status when auto_accept_bookings is false', async () => {
    mockAdminClient.from.mockImplementation((table: string) => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(async () => {
          if (table === 'users') return { data: { role: 'OWNER' } }
          if (table === 'slots')
            return {
              data: {
                id: 'slot-1',
                venue_id: 'venue-1',
                price: 1000,
                status: 'Available',
                venues: { owner_id: 'owner-1', name: 'Test Venue' },
              },
            }
          if (table === 'bookings') return { data: { id: 'booking-1', status: 'PENDING' } }
          return { data: null }
        }),
        maybeSingle: vi.fn().mockImplementation(async () => {
          if (table === 'owner_settings') {
            return {
              data: { auto_accept_bookings: false, notify_bookings: false, notify_email: false },
            }
          }
          return { data: null }
        }),
      }
    })

    const req = new Request('http://localhost/api/bookings/create', {
      method: 'POST',
      body: JSON.stringify({ slotId: 'slot-1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockAdminClient.rpc).toHaveBeenCalledWith(
      'rpc_book_slot',
      expect.objectContaining({
        p_status: 'PENDING',
      })
    )
  })

  it('should use actual owner email for notification instead of hardcoded string', async () => {
    const localInsertSpy = vi.fn().mockReturnThis()

    mockAdminClient.from.mockImplementation((table: string) => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(async () => {
          if (table === 'users') return { data: { role: 'OWNER' } }
          if (table === 'slots')
            return {
              data: {
                id: 'slot-1',
                venue_id: 'venue-1',
                price: 1000,
                status: 'Available',
                venues: { owner_id: 'owner-1', name: 'Test Venue' },
              },
            }
          if (table === 'bookings') return { data: { id: 'booking-1', status: 'CONFIRMED' } }
          return { data: null }
        }),
        maybeSingle: vi.fn().mockImplementation(async () => {
          if (table === 'owner_settings') {
            return {
              data: { auto_accept_bookings: true, notify_bookings: true, notify_email: true },
            }
          }
          if (table === 'owner_profiles') {
            return { data: { user_id: 'owner-user-1', users: { email: 'real-owner@example.com' } } }
          }
          return { data: null }
        }),
        insert: localInsertSpy,
        __insertSpy: localInsertSpy,
      }
    })

    const req = new Request('http://localhost/api/bookings/create', {
      method: 'POST',
      body: JSON.stringify({ slotId: 'slot-1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockAdminClient.from('email_logs').__insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient_email: 'real-owner@example.com',
      })
    )
  })
})
