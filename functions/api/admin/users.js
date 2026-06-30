import { createClient } from '@libsql/client/web';
import jwt from '@tsndr/cloudflare-worker-jwt';

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

export async function onRequestGet(context) {
    const { request, env } = context;
    if (!(await requireAdmin(request, env))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    }

    const client = createClient({ url: env.TURSO_URL, authToken: env.TURSO_AUTH });
    try {
        const res = await client.execute('SELECT id, email, first_name, last_name, role, is_verified FROM users');
        return new Response(JSON.stringify(res.rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    if (!(await requireAdmin(request, env))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    }

    const { email, role } = await request.json();
    if (!email) return new Response(JSON.stringify({ error: 'Email required' }), { status: 400 });

    const client = createClient({ url: env.TURSO_URL, authToken: env.TURSO_AUTH });
    try {
        const id = crypto.randomUUID();
        // Insert user as already verified since an admin created them
        await client.execute({
            sql: 'INSERT INTO users (id, email, role, is_verified) VALUES (?, ?, ?, 1)',
            args: [id, email.toLowerCase(), role || 'user']
        });
        return new Response(JSON.stringify({ message: 'User added' }), { status: 201 });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Failed to add user (might already exist)' }), { status: 500 });
    }
}

export async function onRequestPut(context) {
    const { request, env } = context;
    if (!(await requireAdmin(request, env))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    }

    const { userId, role } = await request.json();
    if (!userId || !role) return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });

    const client = createClient({ url: env.TURSO_URL, authToken: env.TURSO_AUTH });
    try {
        await client.execute({
            sql: 'UPDATE users SET role = ? WHERE id = ?',
            args: [role, userId]
        });
        return new Response(JSON.stringify({ message: 'Role updated' }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
    }
}
