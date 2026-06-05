import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

async function check(label, connectionString, ssl) {
  const pool = new Pool({
    connectionString,
    ssl: ssl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 20000,
  })
  try {
    const tables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1"
    )
    console.log(`\n=== ${label} ===`)
    console.log('Tables:', tables.rows.map((r) => r.table_name).join(', '))
    const count = await pool.query('SELECT COUNT(*)::int AS c FROM "User"')
    console.log('User count:', count.rows[0].c)
    const users = await pool.query('SELECT "clerkId", email FROM "User"')
    console.log('Users:', users.rows)
  } catch (err) {
    console.log(`\n=== ${label} ===`)
    console.log('Error:', err.message)
  } finally {
    await pool.end()
  }
}

await check('Supabase (DATABASE_URL)', process.env.DATABASE_URL, true)
await check(
  'Local (localhost:5433)',
  'postgresql://postgres:Dark9407-@localhost:5433/drawspace',
  false
)
