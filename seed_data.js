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

const data = [
    { ws: "WS02 Cavity Storage", skills: [] },
    { ws: "WS03 Incoming Inspection Rf", skills: ["Measurement of the Passband"] },
    { ws: "WS03 Incoming Inspection Mech", skills: [] },
    { ws: "WS04 CSI", skills: ["Mechanical UHV Connection", "Vacuum UHV Connection", "Cavity Loading", "Cavity Unloading", "Rf Checks on the Stand", "Cryo Checks on the stand", "CSI Transfer"] },
    { ws: "WS05 VTF Bunker", skills: [] },
    { ws: "WS06 diphase Cutting Room", skills: [] },
    { ws: "WS07 Main Cleanroom", skills: [] },
    { ws: "WS08 Outgoing Inspection Rf", skills: ["Measurement of the Passband", "Set up to peform measurements for Q external on coupler", "Measurements for Q external on coupler"] },
    { ws: "WS09 HPR", skills: ["Cavity Moved into Cleanroom", "Pumping of the Vacuum Line", "Cavity Venting", "UPW Readiness", "HPR Cavity and Dry in the drying room", "Cavity Pumpdown", "SPSV Line venting", "Disconnect Cavity from SPSV System", "Rf check post HPR", "Removal of cavity from cleanroom"] },
    { ws: "WS09 UPW", skills: [] },
    { ws: "WS10 Cryoplant and services", skills: [] },
    { ws: "WS12 2K Pumps", skills: [] },
    { ws: "WS13 General Gas", skills: [] },
    { ws: "WS14 Rack room", skills: [] },
    { ws: "WS15 Storage area", skills: [] },
    { ws: "WS16 Plant Room", skills: [] },
    { ws: "WS17 Clean room changing room", skills: [] },
    { ws: "WS19 SURF Lab office", skills: [] },
    { ws: "WS20 Control Room", skills: [] },
    { ws: "WS21 Cold Mass Assembly Tooling", skills: [] },
    { ws: "WS22 CM Test", skills: [] },
    { ws: "WS23 Transport Frame Parking", skills: [] },
    { ws: "WS24 Cryogenic Thermal Cycling", skills: [] },
    { ws: "WS25 Meeting Room", skills: [] },
    { ws: "WS26 Demag", skills: [] },
    { ws: "WS27 Strongback Assembly", skills: [] },
    { ws: "WS28 tuner Tests", skills: [] },
    { ws: "WS29 SPSV and purge system", skills: [] },
    { ws: "WS30 PIP-II String Cleanroom", skills: [] },
    { ws: "WS31 Welding Bay", skills: [] }
];

async function seedData() {
    console.log("Seeding database...");
    try {
        // Clear existing data (optional, but requested to 'add these')
        // We'll just insert, but if they already exist, we should avoid duplicates.
        // Easiest is to delete existing or just check. Let's delete existing workstations and skills for a clean slate.
        // But wait, the prompt says "add these". I will just insert them.

        for (const item of data) {
            // Check if workstation exists
            const wsRes = await db.execute({
                sql: 'SELECT id FROM workstations WHERE name = ?',
                args: [item.ws]
            });
            
            let wsId;
            if (wsRes.rows.length === 0) {
                const id = crypto.randomUUID();
                await db.execute({
                    sql: 'INSERT INTO workstations (id, name) VALUES (?, ?)',
                    args: [id, item.ws]
                });
                wsId = id;
                console.log(`Added WS: ${item.ws}`);
            } else {
                wsId = wsRes.rows[0].id;
                console.log(`Skipped WS (exists): ${item.ws}`);
            }

            // Add skills
            for (const skillName of item.skills) {
                const skillRes = await db.execute({
                    sql: 'SELECT id FROM skills WHERE name = ? AND workstation_id = ?',
                    args: [skillName, wsId]
                });

                if (skillRes.rows.length === 0) {
                    await db.execute({
                        sql: 'INSERT INTO skills (id, workstation_id, name) VALUES (?, ?, ?)',
                        args: [crypto.randomUUID(), wsId, skillName]
                    });
                    console.log(`  Added Skill: ${skillName}`);
                } else {
                    console.log(`  Skipped Skill (exists): ${skillName}`);
                }
            }
        }
        console.log("Database successfully seeded!");
    } catch (e) {
        console.error("Error seeding database:", e);
    }
}

seedData();
