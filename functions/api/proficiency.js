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
  
  const token = cookieHeader.split('; ').find(row => row.startsWith('session='))?.split('=')[1];
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const isValid = await jwt.verify(token, env.JWT_SECRET);
  if (!isValid) return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 });

  const { payload } = jwt.decode(token);
  
  // 3. Request Data
  let { memberId, skillId, level } = await request.json();

  // Validate permission (must be admin or modifying own proficiency)
  if (payload.role !== 'admin' && payload.id !== memberId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const client = createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_AUTH,
  });

  try {
    if (level === 'none') {
        // Delete the record if it's none
        await client.execute({
            sql: 'DELETE FROM user_skills WHERE user_id = ? AND skill_id = ?',
            args: [memberId, skillId]
        });
    } else {
        // Upsert the new proficiency
        await client.execute({
            sql: `INSERT INTO user_skills (user_id, skill_id, proficiency_level) 
                  VALUES (?, ?, ?)
                  ON CONFLICT(user_id, skill_id) DO UPDATE SET proficiency_level=excluded.proficiency_level`,
            args: [memberId, skillId, level]
        });
    }

    return new Response(JSON.stringify({ message: 'Proficiency updated' }), { status: 200 });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
  }
}
