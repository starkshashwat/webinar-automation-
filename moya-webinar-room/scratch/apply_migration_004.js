const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/codex and antigravity/webinar automation/moya-webinar-room/.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  try {
    const fs = require('fs');
    const sql = fs.readFileSync('d:/codex and antigravity/webinar automation/moya-webinar-room/supabase/migrations/004_add_broadcast_settings.sql', 'utf8');
    await pool.query(sql);
    console.log("Migration 004 applied successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

main();
