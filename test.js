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
        await db.execute('ALTER TABLE users ADD COLUMN reset_code TEXT');
        await db.execute('ALTER TABLE users ADD COLUMN reset_expiry INTEGER');
        console.log('Migration successful');
    } catch (e) {
        // Ignore "duplicate column" errors if they already exist
        console.log('Migration finished (columns might already exist)', e.message);
    }
}
run();
