import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// This runner accepts no database URL. It creates and removes its own local
// container, so it cannot accidentally run migrations against Supabase.
for (const name of ["DB_TEST_URL", "DATABASE_URL"]) {
  if (process.env[name]) throw new Error(`${name} is not accepted by db:test; unset it to use the disposable local container`);
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const name = `ask-dj-db-test-${randomUUID().slice(0, 12)}`;
function docker(args, input) {
  const result = spawnSync("docker", args, { cwd: root, input, encoding: "utf8", timeout: 120_000 });
  if (result.error || result.status !== 0) throw new Error(`docker ${args.join(" ")} failed: ${result.error?.message ?? result.stderr}`);
  return result.stdout.trim();
}
function sql(database, source, variables = []) {
  const text = source.endsWith(".sql") ? readFileSync(resolve(root, source), "utf8") : source;
  return docker(["exec", "-i", name, "psql", "-X", "-v", "ON_ERROR_STOP=1", ...variables.flatMap(([key, value]) => ["-v", `${key}=${value}`]), "-U", "postgres", "-d", database], text);
}
function psqlProcess(database, text, onOutput) {
  const child = spawn("docker", ["exec", "-i", name, "psql", "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", database], { cwd: root });
  let output = "";
  let error = "";
  child.stdout.on("data", (data) => { output += data.toString(); onOutput?.(output); });
  child.stderr.on("data", (data) => { error += data.toString(); });
  child.stdin.end(text);
  return { child, done: new Promise((resolve, reject) => child.on("close", (code) => code === 0 ? resolve(output) : reject(new Error(error || `psql exited ${code}`)))) };
}
async function checkConcurrentClaim(database) {
  sql(database, "INSERT INTO public.chat_exchanges (session_id, persona, focus, lang, query, response) VALUES ('race', 'recruiter', 'full_stack', 'en', 'Race?', 'Answer');");
  let second;
  const first = psqlProcess(database, `BEGIN;
SELECT (public.claim_correction_review((SELECT max(id) FROM public.chat_exchanges), 'race-a', 'needs_improvement', null, 'Answer A', now())).correction_owner_token;
\\echo CLAIMED
SELECT pg_sleep(1.5);
COMMIT;`, (output) => {
    if (output.includes("CLAIMED") && !second) second = psqlProcess(database, `SELECT coalesce((public.claim_correction_review((SELECT max(id) FROM public.chat_exchanges), 'race-b', 'good', null, 'Answer B', now())).correction_owner_token, 'NO_CLAIM');`);
  });
  await first.done;
  if (!second) throw new Error("Concurrent claim did not start");
  if (!(await second.done).includes("NO_CLAIM")) throw new Error("Concurrent claim was not excluded");
  const current = sql(database, "SELECT improvement_text, correction_owner_token FROM public.chat_exchanges WHERE session_id = 'race';");
  if (!current.includes("Answer A") || !current.includes("race-a")) throw new Error("Concurrent claim changed the first owner's review");
}

const endpoint = docker(["context", "inspect", "--format", "{{.Endpoints.docker.Host}}"]).split("\n")[0];
if (!endpoint.startsWith("unix://") && !endpoint.startsWith("npipe://")) {
  throw new Error(`db:test requires a local Docker context; got ${endpoint}`);
}

try {
  docker(["run", "--rm", "-d", "--name", name, "-e", "POSTGRES_PASSWORD=local-test-only", "postgres:16-alpine"]);
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    // The image's initialization server accepts Unix sockets briefly before
    // shutting down. TCP readiness identifies the final server only.
    const check = spawnSync("docker", ["exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"], { encoding: "utf8" });
    if (check.status === 0) { ready = true; break; }
    await new Promise((done) => setTimeout(done, 250));
  }
  if (!ready) throw new Error("Disposable PostgreSQL did not become ready");
  sql("postgres", "CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;");

  for (const mode of ["fresh", "adoption"]) {
    const database = `ask_dj_test_${mode}`;
    sql("postgres", `CREATE DATABASE ${database};`);
    sql(database, "database/001_initial.sql");
    if (mode === "adoption") sql(database, "tests/database/adoption.fixture.sql");
    sql(database, "database/002_correction_sync.sql");
    sql(database, "tests/database/schema.test.sql", [["is_adoption", mode === "adoption" ? "true" : "false"]]);
    await checkConcurrentClaim(database);
    console.log(`${mode}: schema, RLS/grants, correction round trips and concurrent claim passed`);
  }
} finally {
  docker(["rm", "-f", name]);
}
