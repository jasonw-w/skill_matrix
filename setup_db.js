import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const client = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_AUTH,
});

async function setup() {
  try {
    console.log("Creating tables...");

    await client.execute(`
      CREATE TABLE IF NOT EXISTS workstations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS skills (
        id TEXT PRIMARY KEY,
        workstation_id TEXT NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY (workstation_id) REFERENCES workstations(id)
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS proficiencies (
        member_id TEXT NOT NULL,
        skill_id TEXT NOT NULL,
        level TEXT NOT NULL,
        PRIMARY KEY (member_id, skill_id),
        FOREIGN KEY (member_id) REFERENCES members(id),
        FOREIGN KEY (skill_id) REFERENCES skills(id)
      )
    `);

    await client.execute(`DROP TABLE IF EXISTS users`);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT,
        last_name TEXT,
        note TEXT,
        password_hash TEXT,
        role TEXT DEFAULT 'user',
        is_verified BOOLEAN DEFAULT 0,
        verification_code TEXT,
        code_expires_at INTEGER
      )
    `);

    console.log("Tables created successfully!");
  } catch (error) {
    console.error("Error creating tables:", error);
  }
}

setup();
