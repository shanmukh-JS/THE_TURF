export interface NotificationPayload {
  recipient: string
  type: string
  templateName: string
  variables: Record<string, string>
  bookingId?: string
  userId?: string
  idempotencyKey?: string
}

export interface ProviderResponse {
  success: boolean
  messageId?: string
  error?: string
  provider: string
}

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<ProviderResponse>
}
