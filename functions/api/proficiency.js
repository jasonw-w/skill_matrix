import { createClient } from '@libsql/client/web';
import jwt from '@tsndr/cloudflare-worker-jwt';

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. CSRF Protection
  if (!request.headers.get('X-CSRF-Token')) {
      return new Response(JSON.stringify({ error: 'Missing CSRF Token' }), { status: 403 });
  }

  // 2. Auth Verification
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  
  const match = cookieHeader.match(/session=([^;]+)/);
  if (!match) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const token = match[1];

  const isValid = await jwt.verify(token, env.JWT_SECRET);
  if (!isValid) return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 });

  const { payload } = jwt.decode(token);
  
  // 3. Request Data
  let { changes } = await request.json();
  if (!changes || !Array.isArray(changes)) {
      return new Response(JSON.stringify({ error: 'Invalid payload, expected array of changes' }), { status: 400 });
  }

  // Validate permission for each change
  for (const change of changes) {
      if (payload.role !== 'admin' && String(payload.id) !== String(change.memberId)) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
      }
  }

  const client = createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_AUTH,
  });

  try {
    const statements = changes.map(change => {
        if (change.level === 'none') {
            return {
                sql: 'DELETE FROM proficiencies WHERE member_id = ? AND skill_id = ?',
                args: [change.memberId, change.skillId]
            };
        } else {
            return {
                sql: `INSERT INTO proficiencies (member_id, skill_id, level) 
                      VALUES (?, ?, ?)
                      ON CONFLICT(member_id, skill_id) DO UPDATE SET level=excluded.level`,
                args: [change.memberId, change.skillId, change.level]
            };
        }
    });

    if (statements.length > 0) {
        await client.batch(statements, 'write');
    }

    return new Response(JSON.stringify({ message: 'Proficiencies updated successfully' }), { status: 200 });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
  }
}
