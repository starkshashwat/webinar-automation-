const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54332/postgres'
});

async function main() {
  try {
    const sql = `
      ALTER TABLE public.webinars
      ADD COLUMN IF NOT EXISTS ai_cta_broadcast_prompt TEXT DEFAULT 'Here is the final offer. Get the course now!';
    `;
    await pool.query(sql);
    console.log("Migration 005 applied successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

main();
