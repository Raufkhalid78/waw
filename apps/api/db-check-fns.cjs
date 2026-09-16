const { Client } = require("pg");

const cs = process.argv[2];
const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });

async function main() {
  await c.connect();
  const r = await c.query(
    "SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND (p.proname LIKE '%advisory%' OR p.proname LIKE '%outbox%')",
  );
  if (r.rows.length === 0) {
    console.log("NO advisory/outbox functions exist in public schema");
  } else {
    r.rows.forEach((x) => console.log(" ", x.proname, "(", x.args, ")"));
  }

  // check claim_outbox_events specifically (referenced in migration 045/049 revokes)
  const claim = await c.query(
    "SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname='public' AND p.proname = 'claim_outbox_events'",
  );
  console.log("claim_outbox_events exists:", claim.rows.length > 0);

  await c.end();
}

main().catch((e) => {
  console.log("ERR:", e.message);
  process.exit(1);
});
