const path = require("node:path");
const {
  PRISMA_DIR,
  assertAllowedTestDatabasePath,
} = require("./lib/database-safety.cjs");

const allowed = [
  path.join(PRISMA_DIR, "test.db"),
  path.join(PRISMA_DIR, "test-import.db"),
  path.join(PRISMA_DIR, "test-rating-openai.db"),
];
const rejected = [
  path.join(PRISMA_DIR, "dev.db"),
  path.join(PRISMA_DIR, "..", "dev.db"),
  path.join(PRISMA_DIR, "..", "outside-test.db"),
  path.join(PRISMA_DIR, "notes.txt"),
  path.join(PRISMA_DIR, "prod-test.sqlite"),
];

for (const target of allowed) {
  assert(assertAllowedTestDatabasePath(target).endsWith(path.basename(target)), `Expected allowed path: ${target}`);
}

for (const target of rejected) {
  let failed = false;
  try {
    assertAllowedTestDatabasePath(target);
  } catch {
    failed = true;
  }
  assert(failed, `Expected rejected path: ${target}`);
}

console.log("Database path guard tests passed.");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
