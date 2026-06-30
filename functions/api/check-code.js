import { createClient } from '@libsql/client/web';

export async function onRequestPost(context) {
  const { request, env } = context;
  let { email, code } = await request.json();
  if (email) email = email.toLowerCase();

  if (!email || !code) {
    return new Response(JSON.stringify({ error: 'Missing email or code' }), { status: 400 });
  }

  const client = createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_AUTH,
  });

  try {
    const userRes = await client.execute({
      sql: 'SELECT verification_code, code_expires_at FROM users WHERE email = ?',
      args: [email]
    });

    if (userRes.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    const user = userRes.rows[0];

    if (user.verification_code !== code) {
      return new Response(JSON.stringify({ error: 'Invalid verification code' }), { status: 400 });
    }

    if (Date.now() > user.code_expires_at) {
      return new Response(JSON.stringify({ error: 'Code expired' }), { status: 400 });
    }

    return new Response(JSON.stringify({ message: 'Code valid' }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
  }
}
