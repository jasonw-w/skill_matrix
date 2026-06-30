import { createClient } from '@libsql/client/web';
import jwt from '@tsndr/cloudflare-worker-jwt';

// Quick edge-compatible hashing (SHA-256 for simplicity in Edge without heavy bcrypt compilation)
// Note: In a production Edge environment, you'd use PBKDF2 or WebCrypto's SubtleCrypto for strong password hashing.
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let { email, password } = await request.json();
  if (email) email = email.toLowerCase();

  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Email and password required' }), { status: 400 });
  }

  const client = createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_AUTH,
  });

  try {
    const userRes = await client.execute({
      sql: 'SELECT * FROM users WHERE email = ? AND is_verified = 1',
      args: [email]
    });

    if (userRes.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid credentials or unverified email' }), { status: 401 });
    }

    const user = userRes.rows[0];
    const passwordHash = await hashPassword(password);

    if (user.password_hash !== passwordHash) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
    }

    // Create JWT
    const token = await jwt.sign({ 
      id: user.id, 
      email: user.email, 
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name
    }, env.JWT_SECRET, { expiresIn: '7d' });

    // Set HTTP-Only Session Cookie
    const cookie = `session=${token}; HttpOnly; Secure; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict`;

    return new Response(JSON.stringify({ message: 'Logged in successfully', role: user.role }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie
      }
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
