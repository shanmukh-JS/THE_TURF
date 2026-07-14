const http = require('http')

async function testPrivilegeEscalation() {
  console.log('Testing privilege escalation on /api/auth/register...')

  // Note: Replace this with the actual base URL of the local dev server
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000'

  const payload = {
    name: 'Hacker Test',
    email: `hacker+${Date.now()}@gmail.com`,
    phone: '9999999999',
    password: 'Password123!',
    role: 'ADMIN', // Malicious payload
  }

  try {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    console.log('Registration Response:', data)

    if (data.success) {
      console.log('✅ Registration succeeded. Now we need to verify the database role.')
      console.log(
        'To fully verify, please check the database to ensure the newly created user (or temp_registration) has role="CUSTOMER", not "ADMIN".'
      )
      console.log(
        `Run query: SELECT email, role FROM public.temp_registrations WHERE email = '${payload.email}';`
      )
    } else {
      console.log(
        'Registration failed (might be expected if email format or something else is blocked):',
        data
      )
    }
  } catch (error) {
    console.error('Error during test:', error)
  }
}

testPrivilegeEscalation()
