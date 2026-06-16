const path = require("node:path");
const {
  assertAllowedTestDatabasePath,
  resolveSqliteFileFromDatabaseUrl,
} = require("./database-safety.cjs");

function assertIsolatedTestDatabase() {
  const databasePath = resolveSqliteFileFromDatabaseUrl(process.env.DATABASE_URL);
  const allowedPath = assertAllowedTestDatabasePath(databasePath);
  const expectedFile = process.env.TEST_DATABASE_FILE;

  if (expectedFile && path.basename(allowedPath) !== expectedFile) {
    throw new Error("Child process DATABASE_URL did not resolve to the expected isolated test database.");
  }

  console.log("Database mode: isolated test database");
  console.log(`Database file: ${path.basename(allowedPath)}`);
  console.log("Development database protected: yes");
  return allowedPath;
}

module.exports = {
  assertIsolatedTestDatabase,
};
