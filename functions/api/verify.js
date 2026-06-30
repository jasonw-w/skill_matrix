import { createClient } from '@libsql/client/web';

// Edge-compatible hashing
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let { email, code, password, firstName, lastName } = await request.json();
  if (email) email = email.toLowerCase();

  if (!email || !code || !password || !firstName || !lastName) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  const client = createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_AUTH,
  });

  try {
    const userRes = await client.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email]
    });

    if (userRes.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    const user = userRes.rows[0];

    // Check if code matches and is not expired
    if (user.verification_code !== code) {
      return new Response(JSON.stringify({ error: 'Invalid verification code' }), { status: 400 });
    }

    if (Date.now() > user.code_expires_at) {
      return new Response(JSON.stringify({ error: 'Verification code has expired' }), { status: 400 });
    }

    // Set the password and mark as verified
    const passwordHash = await hashPassword(password);
    
    // Auto-promote first verified user to admin
    const verifiedUsersCount = await client.execute('SELECT COUNT(*) as count FROM users WHERE is_verified = 1');
    const role = verifiedUsersCount.rows[0].count === 0 ? 'admin' : 'user';

    await client.execute({
      sql: `UPDATE users SET 
            is_verified = 1, 
            password_hash = ?, 
            first_name = ?, 
            last_name = ?,
            role = ?,
            verification_code = NULL, 
            code_expires_at = NULL 
            WHERE email = ?`,
      args: [passwordHash, firstName, lastName, role, email]
    });

    return new Response(JSON.stringify({ message: 'Account verified successfully! You can now log in.' }), { status: 200 });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
  }
}
