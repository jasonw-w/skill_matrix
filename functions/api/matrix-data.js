import { createClient } from '@libsql/client/web';
import jwt from '@tsndr/cloudflare-worker-jwt';

export async function onRequestGet(context) {
  const { request, env } = context;

  // Read session cookie to ensure they are logged in
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return new Response('Unauthorized', { status: 401 });
  
  const match = cookieHeader.match(/session=([^;]+)/);
  if (!match) return new Response('Unauthorized', { status: 401 });
  
  const token = match[1];

  try {
    const isValid = await jwt.verify(token, env.JWT_SECRET);
    if (!isValid) return new Response('Unauthorized', { status: 401 });

    const client = createClient({
      url: env.TURSO_URL,
      authToken: env.TURSO_AUTH,
    });

    const workstationsRes = await client.execute('SELECT * FROM workstations');
    const skillsRes = await client.execute('SELECT * FROM skills');
    const membersRes = await client.execute("SELECT id, first_name || ' ' || last_name as name, note FROM users WHERE is_verified = 1");
    const proficienciesRes = await client.execute('SELECT * FROM proficiencies');

    const skillsTree = workstationsRes.rows.map(ws => {
      return {
        id: ws.id,
        name: ws.name,
        children: skillsRes.rows
          .filter(s => s.workstation_id === ws.id)
          .map(s => ({ id: s.id, name: s.name }))
      };
    });

    const members = membersRes.rows.map(m => ({ id: m.id, name: m.name, note: m.note }));
    const proficiencies = {};
    proficienciesRes.rows.forEach(p => {
      if (!proficiencies[p.member_id]) proficiencies[p.member_id] = {};
      proficiencies[p.member_id][p.skill_id] = p.level;
    });

    return new Response(JSON.stringify({ members, proficiencies, skillsTree }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch matrix data' }), { status: 500 });
  }
}