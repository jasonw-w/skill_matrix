import { createClient } from '@libsql/client/web';

export async function onRequestPost(context) {
  const { request, env } = context;
  let { email } = await request.json();
  if (email) email = email.toLowerCase();

  if (!email) {
    return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400 });
  }

  const client = createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_AUTH,
  });

  try {
    // 1. Verify user exists
    const res = await client.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email]
    });

    if (res.rows.length === 0) {
      // Return 200 even if not found to prevent email enumeration
      return new Response(JSON.stringify({ message: 'If the email exists, a code was sent.' }), { status: 200 });
    }

    // 2. Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes from now

    // 3. Save to database
    await client.execute({
      sql: 'UPDATE users SET reset_code = ?, reset_expiry = ? WHERE email = ?',
      args: [resetCode, resetExpiry, email]
    });

    // 4. Send Email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_AUTH}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Skill Matrix <onboarding@resend.dev>',
        to: email,
        subject: 'Password Reset Code',
        html: `<p>Your password reset code is: <strong>${resetCode}</strong></p><p>This code will expire in 15 minutes.</p>`
      })
    });

    if (!resendResponse.ok) {
        const errData = await resendResponse.json();
        console.error("Resend Error:", errData);
        throw new Error("Failed to send email");
    }

    return new Response(JSON.stringify({ message: 'Code sent successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
