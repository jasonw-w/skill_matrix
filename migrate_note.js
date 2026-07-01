import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const client = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_AUTH,
});

async function migrate() {
  try {
    console.log("Adding note column to users table...");
    await client.execute(`ALTER TABLE users ADD COLUMN note TEXT;`);
    console.log("Migration successful.");
  } catch (error) {
    if (error.message && error.message.includes("duplicate column name")) {
        console.log("Column already exists. Skipping.");
    } else {
        console.error("Migration failed:", error);
    }
  }
}

migrate();
