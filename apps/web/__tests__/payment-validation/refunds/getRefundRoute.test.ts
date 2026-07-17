import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../../../app/api/bookings/refund/route'

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockReturnValue(mockSupabase),
}))

describe('GET /api/bookings/refund Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Auth error'),
    })

    const request = new Request('http://localhost/api/bookings/refund?bookingId=book-123')
    const response = await GET(request)

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('should return 400 if search parameters are missing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null })

    const request = new Request('http://localhost/api/bookings/refund')
    const response = await GET(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Missing bookingId or refundId query parameter')
  })

  it('should return 404 if refund record is not found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null })

    // Mock user role fetch
    const mockSingleUser = vi.fn().mockResolvedValue({ data: { role: 'PLAYER' }, error: null })
    // Mock refund fetch
    const mockMaybeSingleRefund = vi.fn().mockResolvedValue({ data: null, error: null })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi
            .fn()
            .mockReturnValue({ eq: vi.fn().mockReturnValue({ single: mockSingleUser }) }),
        }
      }
      return {
        select: vi
          .fn()
          .mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleRefund }) }),
      }
    })

    const request = new Request('http://localhost/api/bookings/refund?bookingId=book-123')
    const response = await GET(request)

    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json.error).toBe('Refund record not found')
  })

  it('should return 403 if user is not authorized to view the refund', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'stranger-123' } },
      error: null,
    })

    // Mock user role fetch
    const mockSingleUser = vi.fn().mockResolvedValue({ data: { role: 'PLAYER' }, error: null })
    // Mock refund fetch returning a booking owned by someone else
    const mockMaybeSingleRefund = vi.fn().mockResolvedValue({
      data: {
        id: 'refund-123',
        bookings: {
          customer_id: 'player-456',
          venues: { owner_id: 'owner-789' },
        },
      },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi
            .fn()
            .mockReturnValue({ eq: vi.fn().mockReturnValue({ single: mockSingleUser }) }),
        }
      }
      return {
        select: vi
          .fn()
          .mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleRefund }) }),
      }
    })

    const request = new Request('http://localhost/api/bookings/refund?bookingId=book-123')
    const response = await GET(request)

    expect(response.status).toBe(403)
    const json = await response.json()
    expect(json.error).toBe('Forbidden: You do not have permission to view this refund')
  })

  it('should return 200 with refund details and events if user is authorized', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'player-456' } },
      error: null,
    })

    // Mock user role fetch
    const mockSingleUser = vi.fn().mockResolvedValue({ data: { role: 'PLAYER' }, error: null })
    // Mock refund fetch returning booking owned by this player
    const mockMaybeSingleRefund = vi.fn().mockResolvedValue({
      data: {
        id: 'refund-123',
        booking_id: 'book-123',
        bookings: {
          customer_id: 'player-456',
          venues: { owner_id: 'owner-789' },
        },
      },
      error: null,
    })
    // Mock event logs fetch
    const mockSelectEvents = vi.fn().mockResolvedValue({
      data: [{ id: 'evt-1', event_type: 'WORKER_STARTED' }],
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi
            .fn()
            .mockReturnValue({ eq: vi.fn().mockReturnValue({ single: mockSingleUser }) }),
        }
      }
      if (table === 'refund_events') {
        return {
          select: vi
            .fn()
            .mockReturnValue({ eq: vi.fn().mockReturnValue({ order: mockSelectEvents }) }),
        }
      }
      return {
        select: vi
          .fn()
          .mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleRefund }) }),
      }
    })

    const request = new Request('http://localhost/api/bookings/refund?bookingId=book-123')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(json.data.id).toBe('refund-123')
    expect(json.data.events).toHaveLength(1)
  })
})
