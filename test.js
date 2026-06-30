import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const db = createClient({
    url: process.env.TURSO_URL,
    authToken: process.env.TURSO_AUTH
});

async function run() {
    try {
        const workstationsRes = await db.execute('SELECT * FROM workstations');
        console.log("Workstations:", workstationsRes.rows.length);
        const skillsRes = await db.execute('SELECT * FROM skills');
        console.log("Skills:", skillsRes.rows.length);
        const membersRes = await db.execute('SELECT id, first_name || " " || last_name as name FROM users WHERE is_verified = 1');
        console.log("Members:", membersRes.rows.length);
        const proficienciesRes = await db.execute('SELECT * FROM proficiencies');
        console.log("Proficiencies:", proficienciesRes.rows.length);
    } catch (e) {
        console.error("DB Error:", e);
    }
}
run();
