import { readFileSync } from "fs";
import { resolve } from "path";
import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const sqlPath = resolve(
    process.cwd(),
    "supabase/migrations/001_initial.sql",
  );
  const sql = readFileSync(sqlPath, "utf8");

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(sql);
    console.log("Migration applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
