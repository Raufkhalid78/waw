const { Client } = require("pg");
const fs = require("fs");

const cs = process.argv[2];
const sqlPath = process.argv[3];

const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });

async function main() {
  await c.connect();
  const sql = fs.readFileSync(sqlPath, "utf8");
  await c.query(sql);
  console.log("MIGRATION APPLIED");

  const r = await c.query(
    "SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'cart_items'::regclass",
  );
  r.rows.forEach((x) => console.log(" ", x.conname, "=>", x.def));

  const m = await c.query(
    "SELECT version FROM schema_migrations WHERE version LIKE '05%' ORDER BY version",
  );
  console.log("05x migrations applied:", m.rows.map((x) => x.version).join(", "));

  await c.end();
}

main().catch((e) => {
  console.log("ERR:", e.message);
  process.exit(1);
});
