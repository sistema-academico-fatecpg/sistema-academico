/**
 * Validates that the commits in a given range follow the Conventional Commits
 * specification:
 *
 *   <type>[optional scope]: <description>
 *
 * Supported types: feat, fix, docs, style, refactor, perf, test, build, ci,
 * chore, revert. Auto-generated merge commits are ignored because their
 * messages are produced by Git/GitHub and are not written by contributors.
 *
 * Usage:
 *   COMMIT_RANGE="<base>..<head>" node .github/scripts/validate-conventional-commits.js
 */

const { execSync } = require("node:child_process");

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

const range = process.env.COMMIT_RANGE;
if (!range) {
  console.error("error: COMMIT_RANGE environment variable is not set.");
  process.exit(1);
}

let output;
try {
  output = execSync(`git log ${range} --format=%s`, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
} catch (err) {
  console.error("error: failed to read commit messages for range:", range);
  console.error(err.message);
  process.exit(1);
}

const subjects = output.trim().split("\n").filter(Boolean);

const typeList = TYPES.join("|");
const re = new RegExp(`^(?:${typeList})(?:\\([a-z0-9-]+\\))?(!)?: \\S.*$`);

const invalid = subjects.filter((subject) => {
  // Ignore auto-generated merge commits.
  if (/^merge\b/i.test(subject)) {
    return false;
  }
  return !re.test(subject);
});

if (invalid.length > 0) {
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

console.log(`OK: all ${subjects.length} commit(s) follow Conventional Commits (range: ${range}).`);
