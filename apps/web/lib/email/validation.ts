import { NextResponse } from 'next/server'

const WEAK_DICTIONARY = [
  '12345678',
  '123456789',
  '1234567890',
  'password123',
  'password1234',
  'qwerty',
  'qwertymnbvcxz',
  'trufgaming123',
  'trufgaming',
  'admin123',
  'owner123',
  'customer123',
  'player123',
  'welcome123',
  'cricket123',
  'cricketbox',
  'cricketbox123',
]

export function checkPasswordStrength(
  password: string,
  name?: string,
  email?: string
): { valid: boolean; reason?: string } {
  if (!password || password.length < 12) {
    return { valid: false, reason: 'Password must be at least 12 characters long.' }
  }

  const lowerPassword = password.toLowerCase()
  if (WEAK_DICTIONARY.some((weak) => lowerPassword.includes(weak))) {
    return {
      valid: false,
      reason: 'Password is too common/weak. Please choose a more complex password.',
    }
  }

  if (name) {
    const parts = name.toLowerCase().split(/\s+/)
    if (parts.some((part) => part.length > 3 && lowerPassword.includes(part))) {
      return { valid: false, reason: 'Password cannot contain parts of your name.' }
    }
  }

  if (email) {
    const userPart = (email.split('@')[0] || '').toLowerCase()
    if (userPart.length > 3 && lowerPassword.includes(userPart)) {
      return { valid: false, reason: 'Password cannot contain parts of your email address.' }
    }
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one uppercase letter.' }
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one lowercase letter.' }
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one numeric digit.' }
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return {
      valid: false,
      reason: 'Password must contain at least one special character (e.g. !@#$%^&*).',
    }
  }

  return { valid: true }
}

export function apiSuccess(message: string, data: any = {}) {
  return NextResponse.json({
    success: true,
    message,
    data,
  })
}

export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    { status }
  )
}
