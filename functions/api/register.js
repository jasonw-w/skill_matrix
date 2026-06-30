import { createClient } from '@libsql/client/web';

export async function onRequestPost(context) {
  const { request, env } = context;
  const { email } = await request.json();

  const allowedDomains = ['@stfc.ac.uk', '@fedextest.onmicrosoft.com'];
  const isValidEmail = email && allowedDomains.some(domain => email.endsWith(domain));

  if (!isValidEmail) {
    return new Response(JSON.stringify({ error: 'Email must be from an approved organization (@stfc.ac.uk or @fedextest.onmicrosoft.com)' }), { 
      status: 400, headers: { 'Content-Type': 'application/json' } 
    });
  }

  const client = createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_AUTH,
  });

  // Generate 6-digit code
  const verification_code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

  try {
    const id = crypto.randomUUID();
    // Upsert user (in case they retry registration)
    await client.execute({
      sql: `INSERT INTO users (id, email, verification_code, code_expires_at) 
            VALUES (?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET 
            verification_code=excluded.verification_code, 
            code_expires_at=excluded.code_expires_at`,
      args: [id, email, verification_code, expiresAt]
    });

    // Send email via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_AUTH}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev', // Default testing email
        to: email,
        subject: 'Skill Matrix - Verification Code',
        html: `<p>Your verification code is: <strong>${verification_code}</strong></p>`
      })
    });

    if (!resendRes.ok) {
      console.error('Resend error', await resendRes.text());
      return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500 });
    }

    return new Response(JSON.stringify({ message: 'Verification code sent' }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
  }
}
