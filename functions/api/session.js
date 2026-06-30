import jwt from '@tsndr/cloudflare-worker-jwt';

export async function onRequestGet(context) {
  const { request, env } = context;
  
  // Read session cookie
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return new Response('Unauthorized', { status: 401 });
  
  const match = cookieHeader.match(/session=([^;]+)/);
  if (!match) return new Response('Unauthorized', { status: 401 });
  
  const token = match[1];

  try {
    const isValid = await jwt.verify(token, env.JWT_SECRET);
    if (!isValid) return new Response('Unauthorized', { status: 401 });
    
    const { payload } = jwt.decode(token);
    
    // Return user info
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response('Unauthorized', { status: 401 });
  }
}
