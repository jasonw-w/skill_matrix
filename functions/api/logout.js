export async function onRequestPost(context) {
  if (!context.request.headers.get('X-CSRF-Token')) {
    return new Response('Missing CSRF Token', { status: 403 });
  }
  return new Response(JSON.stringify({ message: 'Logged out' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=Strict'
    }
  });
}
