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

async function requireAdmin(request, env) {
  if (!request.headers.get('X-CSRF-Token')) return false;

  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return false;
  
  const match = cookieHeader.match(/session=([^;]+)/);
  if (!match) return false;
  const token = match[1];

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

    const { email, password, firstName, lastName, role } = await request.json();

    const client = createClient({ url: env.TURSO_URL, authToken: env.TURSO_AUTH });
    try {
        const id = crypto.randomUUID();
        const finalEmail = email ? email.toLowerCase() : `no-login-${id}@system.local`;
        
        let passwordHash = null;
        if (password) {
            passwordHash = await hashPassword(password);
        }

        await client.execute({
            sql: 'INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_verified) VALUES (?, ?, ?, ?, ?, ?, 1)',
            args: [id, finalEmail, passwordHash, firstName || '', lastName || '', role || 'user']
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
