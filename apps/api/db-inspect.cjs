const { Client } = require("pg");

const cs = process.argv[2];
const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });

async function main() {
  await c.connect();

  // Cart items constraints
  const constraints = await c.query(
    "SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'cart_items'::regclass",
  );
  console.log("=== cart_items constraints ===");
  constraints.rows.forEach((x) => console.log(" ", x.conname, "=>", x.def));

  // Does 053's category taxonomy exist?
  const cats = await c.query(
    "SELECT count(*)::int AS n FROM categories",
  );
  console.log("categories rows:", cats.rows[0].n);

  const catCols = await c.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='categories' ORDER BY ordinal_position",
  );
  console.log(
    "category columns:",
    catCols.rows.map((r) => r.column_name).join(", "),
  );

  await c.end();
}

main().catch((e) => {
  console.log("ERR:", e.message);
  process.exit(1);
});
