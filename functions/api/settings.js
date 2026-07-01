import { createClient } from '@libsql/client/web';
import jwt from '@tsndr/cloudflare-worker-jwt';

// Edge-compatible hashing using PBKDF2
async function hashPassword(password, saltHex = null) {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );

  let salt;
  if (saltHex) {
    salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  } else {
    salt = crypto.getRandomValues(new Uint8Array(16));
  }

  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
    passwordKey, 256
  );

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const saltHexStr = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${saltHexStr}:${hashHex}`;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // CSRF Protection
  if (!request.headers.get('X-CSRF-Token')) {
      return new Response(JSON.stringify({ error: 'Missing CSRF Token' }), { status: 403 });
  }

  // Verify Session
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  
  const match = cookieHeader.match(/session=([^;]+)/);
  if (!match) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const token = match[1];

  const isValid = await jwt.verify(token, env.JWT_SECRET);
  if (!isValid) return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 });

  const { payload } = jwt.decode(token);
  const userId = payload.id;

  // Get updates
  let { firstName, lastName, password } = await request.json();

  if (!firstName || !lastName) {
    return new Response(JSON.stringify({ error: 'First name and last name are required' }), { status: 400 });
  }

  const client = createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_AUTH,
  });

  try {
    if (password) {
      if (password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(password)) {
        return new Response(JSON.stringify({ error: 'Password must be at least 8 characters and contain a mix of uppercase, lowercase, and numbers' }), { status: 400 });
      }
      const hashedPassword = await hashPassword(password);
      await client.execute({
        sql: 'UPDATE users SET first_name = ?, last_name = ?, password_hash = ? WHERE id = ?',
        args: [firstName, lastName, hashedPassword, userId]
      });
    } else {
      await client.execute({
        sql: 'UPDATE users SET first_name = ?, last_name = ? WHERE id = ?',
        args: [firstName, lastName, userId]
      });
    }

    // Refresh the JWT with the new names so the frontend sees them immediately
    const newToken = await jwt.sign({ 
        id: payload.id, 
        email: payload.email, 
        role: payload.role,
        first_name: firstName,
        last_name: lastName
      }, env.JWT_SECRET, { expiresIn: '7d' });
  
    const cookie = `session=${newToken}; HttpOnly; Secure; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict`;

    return new Response(JSON.stringify({ message: 'Settings updated successfully' }), {
      status: 200,
      headers: { 
          'Content-Type': 'application/json',
          'Set-Cookie': cookie 
      }
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
