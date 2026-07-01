const { createClient } = require('@libsql/client');
const client = createClient({ url: 'libsql://skillmatrix-jason-w.aws-eu-west-1.turso.io', authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI4NTc3NDcsImlkIjoiMDE5ZjFhOTktZmIwMS03YjJhLThlNWEtNGZkYTYyMWM5NjQ5Iiwia2lkIjoiaWdoM0dSMDdjSEljTUp2VDQ5Z1k4X2R1OW0yNVhaQ1RmZ3ZoSGNwOU10byIsInJpZCI6Ijk0YmEzNGY5LTQ5NjEtNDZjNC1iMWVhLWU3YjYzMDVjZjA3NCJ9.nDaQelDNIkjPRnbh-S-aRSqufhvAl2XcrgBHkJ-9xHCg7N8QWKpUR2Xdx3CdZpwugAh-MPorQ0Twm5rbNQHOAg' });
(async () => {
    try {
        await client.execute('DROP TABLE IF EXISTS proficiencies');
        await client.execute(`
            CREATE TABLE proficiencies (
                member_id TEXT NOT NULL,
                skill_id TEXT NOT NULL,
                level TEXT NOT NULL,
                PRIMARY KEY (member_id, skill_id),
                FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
            )
        `);
        console.log('Successfully recreated proficiencies table!');
    } catch (e) {
        console.error(e);
    }
})();
