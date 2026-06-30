export async function onRequestPost() {
  return new Response(JSON.stringify({ message: 'Logged out' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=Strict'
    }
  });
}
