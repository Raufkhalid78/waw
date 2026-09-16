import { Redis } from "@upstash/redis";

const url = process.argv[2];
const token = process.argv[3];
const r = new Redis({ url, token });

// Test 1: scriptLoad returns sha
const lua = `local totalHits = redis.call("INCR", KEYS[1])
if totalHits == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return totalHits`;

try {
  const sha = await r.scriptLoad(lua);
  console.log("scriptLoad sha:", sha);

  // Test 2: evalsha with (keys[], args[]) — correct Upstash signature
  try {
    const res = await r.evalsha(sha, ["probe:rl_test"], ["60000"]);
    console.log("evalsha(keys, args) result:", JSON.stringify(res));
    const res2 = await r.evalsha(sha, ["probe:rl_test"], ["60000"]);
    console.log("evalsha second call (INCR):", JSON.stringify(res2));
  } catch (e) {
    console.log("evalsha(keys,args) ERR:", e.message);
  }

  // Test 3: cleanup
  await r.del("probe:rl_test");
  console.log("cleanup done");
} catch (e) {
  console.log("ERR:", e.message);
  process.exit(1);
}
