import express from 'express';
import cors from 'cors';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const client = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_AUTH,
});

// --- Auth Middlewares ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 
  if (token == null) return res.status(401).json({ error: 'Token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// --- Auth Routes ---
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const existing = await client.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: [username] });
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Username already exists' });

    // Check if any users exist to determine if this is the first user
    const usersCount = await client.execute('SELECT COUNT(*) as count FROM users');
    const isFirstUser = usersCount.rows[0].count === 0;
    const role = isFirstUser ? 'admin' : 'user';

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = crypto.randomUUID();

    await client.execute({
      sql: 'INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
      args: [userId, username, passwordHash, role]
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const userRes = await client.execute({ sql: 'SELECT * FROM users WHERE username = ?', args: [username] });
    if (userRes.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = userRes.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, username: user.username, role: user.role, id: user.id });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- User Management Routes (Admin Only) ---
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const usersRes = await client.execute('SELECT id, username, role FROM users');
    res.json(usersRes.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = crypto.randomUUID();
    await client.execute({
      sql: 'INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
      args: [userId, username, passwordHash, role || 'user']
    });
    res.status(201).json({ message: 'User created' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  const { role } = req.body;
  if (role !== 'admin' && role !== 'user') return res.status(400).json({ error: 'Invalid role' });

  try {
    await client.execute({
      sql: 'UPDATE users SET role = ? WHERE id = ?',
      args: [role, req.params.id]
    });
    res.json({ message: 'Role updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// --- Matrix Data Routes ---
app.get('/api/matrix-data', authenticateToken, async (req, res) => {
  try {
    const workstationsRes = await client.execute('SELECT * FROM workstations');
    const skillsRes = await client.execute('SELECT * FROM skills');
    // Use users table as members for the matrix columns
    const membersRes = await client.execute('SELECT id, username as name FROM users');
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

    const members = membersRes.rows.map(m => ({ id: m.id, name: m.name }));
    const proficiencies = {};
    proficienciesRes.rows.forEach(p => {
      if (!proficiencies[p.member_id]) proficiencies[p.member_id] = {};
      proficiencies[p.member_id][p.skill_id] = p.level;
    });

    res.json({ members, proficiencies, skillsTree });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch matrix data' });
  }
});

// --- Editing Matrix Routes (All Users) ---
app.post('/api/workstations', authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  try {
    const id = 'ws_' + crypto.randomUUID();
    await client.execute({ sql: 'INSERT INTO workstations (id, name) VALUES (?, ?)', args: [id, name] });
    res.status(201).json({ id, name });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add workstation' });
  }
});

app.post('/api/skills', authenticateToken, async (req, res) => {
  const { workstation_id, name } = req.body;
  if (!workstation_id || !name) return res.status(400).json({ error: 'Workstation ID and name required' });
  try {
    const id = 's_' + crypto.randomUUID();
    await client.execute({ sql: 'INSERT INTO skills (id, workstation_id, name) VALUES (?, ?, ?)', args: [id, workstation_id, name] });
    res.status(201).json({ id, workstation_id, name });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add skill' });
  }
});

app.put('/api/proficiencies', authenticateToken, async (req, res) => {
  const { skill_id, level } = req.body;
  if (!skill_id || !level) return res.status(400).json({ error: 'Missing parameters' });
  // Ensure user is only updating their own proficiency
  const member_id = req.user.id;
  
  try {
    // Upsert proficiency
    await client.execute({
      sql: `INSERT INTO proficiencies (member_id, skill_id, level) VALUES (?, ?, ?)
            ON CONFLICT(member_id, skill_id) DO UPDATE SET level=excluded.level`,
      args: [member_id, skill_id, level]
    });
    res.json({ message: 'Proficiency updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update proficiency' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
