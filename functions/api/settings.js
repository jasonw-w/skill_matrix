import { createClient } from '@libsql/client/web';
import jwt from '@tsndr/cloudflare-worker-jwt';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
  
  const token = cookieHeader.split('; ').find(row => row.startsWith('session='))?.split('=')[1];
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

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
