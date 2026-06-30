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
        const res = await db.execute("SELECT name FROM sqlite_master WHERE type='table'");
        console.log("tables:", res.rows);
    } catch(e) {
        console.error(e);
    }
}
run();
