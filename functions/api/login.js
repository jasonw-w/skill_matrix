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

const rateLimitMap = new Map();
function isRateLimited(ip) {
    const now = Date.now();
    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
        return false;
    }
    const data = rateLimitMap.get(ip);
    if (now > data.resetAt) {
        data.count = 1;
        data.resetAt = now + 60000;
        return false;
    }
    data.count++;
    return data.count > 10; // Max 10 attempts per minute per isolate
}

export async function onRequestPost(context) {
  const { request, env } = context;
  
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (isRateLimited(ip)) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), { status: 429 });
  }

  let { email, password } = await request.json();
  if (email) email = email.toLowerCase();

  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Email and password required' }), { status: 400 });
  }

  try {
    const client = createClient({
      url: env.TURSO_URL,
      authToken: env.TURSO_AUTH,
    });

    const userRes = await client.execute({
      sql: 'SELECT * FROM users WHERE email = ? AND is_verified = 1',
      args: [email]
    });

    if (userRes.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid credentials or unverified email' }), { status: 401 });
    }

    const user = userRes.rows[0];
    const storedHash = user.password_hash;
    let computedHash;
    if (storedHash.includes(':')) {
      const [salt, hash] = storedHash.split(':');
      computedHash = await hashPassword(password, salt);
    } else {
      // Fallback for old SHA-256 hashes
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password));
      computedHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    if (storedHash !== computedHash) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
    }

    // Create JWT
    const token = await jwt.sign({ 
      id: user.id, 
      email: user.email, 
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      note: user.note || null
    }, env.JWT_SECRET, { expiresIn: '7d' });

    // Set HTTP-Only Session Cookie
    const cookie = `session=${token}; HttpOnly; Secure; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict`;

    return new Response(JSON.stringify({ message: 'Logged in successfully', role: user.role }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie
      }
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
