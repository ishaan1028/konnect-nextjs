/**
 * Prints supabase/seed.sql for a hosted project, with every account's password
 * swapped for a random one nobody knows (the local passwords are public, in
 * this repo). Paste the output into the project's SQL Editor, once:
 *
 *   node scripts/production-seed.mjs > production-seed.sql
 *
 * The demo account gets its real password on the first "Continue as demo
 * user": that sign-in fails, and demoSignInAction resets it to the
 * DEMO_USER_PASSWORD set on the server. Posts and photos come after, from
 * `pnpm db:seed-photos --allow-remote`.
 */
import { readFile } from "node:fs/promises";

const sql = await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8");

const random = "extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf'))";
let replaced = 0;
const out = sql.replace(/extensions\.crypt\('[^']*', extensions\.gen_salt\('bf'\)\)/g, () => {
  replaced++;
  return random;
});

// The demo's password and the shared one for the showcase people. If seed.sql
// ever sets passwords differently, stop rather than print a known one.
if (replaced !== 2 || /konnect-(demo|seed)-2026'/.test(out.replace(/^--.*$/gm, ""))) {
  throw new Error(`Expected to replace 2 passwords in seed.sql, replaced ${replaced}.`);
}

process.stdout.write(out);
