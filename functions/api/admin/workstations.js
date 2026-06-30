import { createClient } from '@libsql/client/web';
import jwt from '@tsndr/cloudflare-worker-jwt';

// Ensure user is admin
async function requireAdmin(request, env) {
  if (!request.headers.get('X-CSRF-Token')) return false;

  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return false;
  
  const token = cookieHeader.split('; ').find(row => row.startsWith('session='))?.split('=')[1];
  if (!token) return false;

  const isValid = await jwt.verify(token, env.JWT_SECRET);
  if (!isValid) return false;

  const { payload } = jwt.decode(token);
  return payload.role === 'admin';
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const isAdmin = await requireAdmin(request, env);
  if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized. Admin access required.' }), { status: 403 });
  }

  const { name } = await request.json();
  if (!name) {
    return new Response(JSON.stringify({ error: 'Workstation name is required' }), { status: 400 });
  }

  const client = createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_AUTH,
  });

  try {
    const id = crypto.randomUUID();
    await client.execute({
      sql: 'INSERT INTO workstations (id, name) VALUES (?, ?)',
      args: [id, name]
    });

    return new Response(JSON.stringify({ message: 'Workstation created successfully', workstation: { id, name } }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
  }
}
