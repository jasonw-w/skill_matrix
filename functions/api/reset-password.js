import { createClient } from '@libsql/client/web';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let { email, code, password } = await request.json();
  if (email) email = email.toLowerCase();

  if (!email || !code || !password) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  if (!password || password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(password)) {
    return new Response(JSON.stringify({ error: 'Password must be at least 8 characters and contain a mix of uppercase, lowercase, and numbers' }), { status: 400 });
  }

  const client = createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_AUTH,
  });

  try {
    const res = await client.execute({
      sql: 'SELECT id, reset_code, reset_expiry FROM users WHERE email = ?',
      args: [email]
    });

    if (res.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
    }

    const user = res.rows[0];

    // Check code matches
    if (user.reset_code !== code) {
        return new Response(JSON.stringify({ error: 'Invalid or expired code' }), { status: 400 });
    }

    // Check expiration
    if (Date.now() > user.reset_expiry) {
        return new Response(JSON.stringify({ error: 'Reset code has expired. Please request a new one.' }), { status: 400 });
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update password and clear reset token
    await client.execute({
      sql: 'UPDATE users SET password_hash = ?, reset_code = NULL, reset_expiry = NULL WHERE email = ?',
      args: [hashedPassword, email]
    });

    return new Response(JSON.stringify({ message: 'Password updated successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
