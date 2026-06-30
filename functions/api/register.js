import { createClient } from '@libsql/client/web';

const rateLimitMap = new Map();
function isRateLimited(ip) {
    const now = Date.now();
    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
        return false;
    }
    const data = rateLimitMap.get(ip);
    if (now > data.resetAt) {
        data.count = 1;
        data.resetAt = now + 60000;
        return false;
    }
    data.count++;
    return data.count > 5; // Max 5 attempts per minute
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (isRateLimited(ip)) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), { status: 429 });
  }

  let { email } = await request.json();
  email = email ? email.toLowerCase() : '';

  const allowedDomains = ['@stfc.ac.uk', '@fedextest.onmicrosoft.com'];
  const isValidEmail = email && allowedDomains.some(domain => email.endsWith(domain));

  if (!isValidEmail) {
    return new Response(JSON.stringify({ error: 'Email must be from an approved organization (@stfc.ac.uk or @fedextest.onmicrosoft.com)' }), { 
      status: 400, headers: { 'Content-Type': 'application/json' } 
    });
  }

  // Generate 6-digit code
  const verification_code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

  try {
    const client = createClient({
      url: env.TURSO_URL,
      authToken: env.TURSO_AUTH,
    });

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

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_AUTH}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.RESEND_FROM || 'onboarding@resend.dev', // Use custom domain if verified
        to: email,
        subject: 'Skill Matrix - Verification Code',
        html: `<p>Your verification code is: <strong>${verification_code}</strong></p>`
      })
    });

    if (!resendRes.ok) {
      const errorText = await resendRes.text();
      console.error('Resend error', errorText);
      return new Response(JSON.stringify({ error: 'Failed to send email', details: errorText }), { status: 500 });
    }

    return new Response(JSON.stringify({ message: 'Verification code sent' }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
  }
}
