const { createClient } = require('@libsql/client');
const client = createClient({
    url: 'libsql://skillmatrix-jason-w.aws-eu-west-1.turso.io',
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI4NTc3NDcsImlkIjoiMDE5ZjFhOTktZmIwMS03YjJhLThlNWEtNGZkYTYyMWM5NjQ5Iiwia2lkIjoiaWdoM0dSMDdjSEljTUp2VDQ5Z1k4X2R1OW0yNVhaQ1RmZ3ZoSGNwOU10byIsInJpZCI6Ijk0YmEzNGY5LTQ5NjEtNDZjNC1iMWVhLWU3YjYzMDVjZjA3NCJ9.nDaQelDNIkjPRnbh-S-aRSqufhvAl2XcrgBHkJ-9xHCg7N8QWKpUR2Xdx3CdZpwugAh-MPorQ0Twm5rbNQHOAg'
});

const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

async function main() {
    const usersRes = await client.execute('SELECT id, first_name FROM users WHERE is_verified = 1');
    const skillsRes = await client.execute('SELECT id FROM skills');

    const users = usersRes.rows;
    const skillIds = skillsRes.rows.map(s => s.id);

    console.log(`Found ${users.length} users and ${skillIds.length} skills`);

    const statements = [];

    for (const user of users) {
        // Each user gets a random 60-80% of skills assigned
        const shuffled = [...skillIds].sort(() => Math.random() - 0.5);
        const count = Math.floor(skillIds.length * (0.6 + Math.random() * 0.2));
        const selectedSkills = shuffled.slice(0, count);

        for (const skillId of selectedSkills) {
            const level = LEVELS[Math.floor(Math.random() * LEVELS.length)];
            statements.push({
                sql: `INSERT INTO proficiencies (member_id, skill_id, level) VALUES (?, ?, ?)
                      ON CONFLICT(member_id, skill_id) DO UPDATE SET level=excluded.level`,
                args: [user.id, skillId, level]
            });
        }
        console.log(`  ${user.first_name}: queued ${selectedSkills.length} skills`);
    }

    console.log(`Sending ${statements.length} upserts to Turso...`);
    // Batch in chunks of 50
    for (let i = 0; i < statements.length; i += 50) {
        await client.batch(statements.slice(i, i + 50), 'write');
    }
    console.log('Done! Random proficiency data seeded successfully.');
}

main().catch(console.error);
