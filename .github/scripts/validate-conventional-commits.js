/**
 * Validates that commit messages follow the Conventional Commits
 * specification:
 *
 *   <type>[optional scope]: <description>
 *
 * Supported types: feat, fix, docs, style, refactor, perf, test, build, ci,
 * chore, revert. Auto-generated merge commits and autosquash markers are
 * ignored because they are not written by contributors.
 *
 * Two modes (same rules, used by CI and by the commit-msg git hook):
 *
 *   COMMIT_MSG_FILE=<path> node .github/scripts/validate-conventional-commits.js
 *   COMMIT_RANGE="<base>..<head>" node .github/scripts/validate-conventional-commits.js
 *   COMMIT_RANGE=LATEST node .github/scripts/validate-conventional-commits.js
 *
 * `COMMIT_MSG_FILE` takes precedence, so the hook can validate a single
 * message without a commit range.
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");

const TYPES = [
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "perf",
  "test",
  "build",
  "ci",
  "chore",
  "revert",
];

const typeList = TYPES.join("|");
const re = new RegExp(`^(?:${typeList})(?:\\([a-z0-9-]+\\))?(!)?: \\S.*$`);

function isIgnorable(subject) {
  return (
    /^merge\b/i.test(subject) || /^(fixup|squash)!\s/i.test(subject) || /^revert "/i.test(subject)
  );
}

function invalidSubjects(subjects) {
  return subjects.filter((subject) => !isIgnorable(subject) && !re.test(subject));
}

function report(invalid) {
  console.error(`error: ${invalid.length} commit(s) do not follow Conventional Commits.`);
  console.error("");
  console.error("Format: <type>[optional scope]: <description>");
  console.error(`Supported types: ${typeList}`);
  console.error("");
  invalid.forEach((subject) => {
    console.error(`  - ${subject}`);
  });
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Mode 1: commit-msg hook (single message file)
// ---------------------------------------------------------------------------
const messageFile = process.env.COMMIT_MSG_FILE;
if (messageFile) {
  let subject = "";
  try {
    const lines = fs.readFileSync(messageFile, "utf8").split("\n");
    subject = (lines.find((line) => line.trim() !== "" && !line.startsWith("#")) ?? "").trim();
  } catch (err) {
    console.error("error: failed to read commit message file:", messageFile);
    console.error(err.message);
    process.exit(1);
  }
  // Empty subject means the commit was aborted; nothing to validate.
  if (subject === "") process.exit(0);
  const invalid = invalidSubjects([subject]);
  if (invalid.length > 0) report(invalid);
  console.log("OK: commit message follows Conventional Commits.");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Mode 2: CI (commit range)
// ---------------------------------------------------------------------------
const range = process.env.COMMIT_RANGE;
if (!range) {
  console.error("error: COMMIT_MSG_FILE or COMMIT_RANGE environment variable is not set.");
  process.exit(1);
}

let output;
try {
  // "LATEST" valida apenas o commit do topo (schedule, workflow_dispatch e
  // push de branch nova, quando não há um intervalo confiável).
  const args = range === "LATEST" ? ["log", "-1", "--format=%s"] : ["log", range, "--format=%s"];
  output = execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
} catch (err) {
  console.error("error: failed to read commit messages for range:", range);
  console.error(err.message);
  process.exit(1);
}

const subjects = output.trim().split("\n").filter(Boolean);
const invalid = invalidSubjects(subjects);
if (invalid.length > 0) report(invalid);

console.log(`OK: all ${subjects.length} commit(s) follow Conventional Commits (range: ${range}).`);
