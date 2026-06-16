const { spawnSync } = require("node:child_process");
const {
  REPO_ROOT,
  cleanupSqliteFiles,
  databaseUrlForPrismaFile,
  initializeTestDatabaseFromDevelopmentSchema,
} = require("./lib/database-safety.cjs");

const TESTS = {
  import: {
    databaseFile: "test-import.db",
    command: [process.execPath, ["scripts/test-import-db.cjs"]],
  },
  rating: {
    databaseFile: "test-rating.db",
    command: [process.execPath, ["scripts/test-rating-db.cjs"]],
  },
  "rating-openai": {
    databaseFile: "test-rating-openai.db",
    command: [process.execPath, ["scripts/test-rating-openai-db.cjs"]],
  },
  "title-intro": {
    databaseFile: "test-title-intro.db",
    command: [process.execPath, ["scripts/test-title-intro-db.cjs"]],
  },
  "batch-recovery": {
    databaseFile: "test-batch-recovery.db",
    command: [process.execPath, ["--experimental-strip-types", "scripts/test-batch-job-recovery.ts"]],
  },
  "intentional-failure": {
    databaseFile: "test-intentional-failure.db",
    command: [process.execPath, ["scripts/test-intentional-failure-db.cjs"]],
  },
};

async function main() {
  const testName = process.argv[2];
  const config = TESTS[testName];

  if (!config) {
    console.error(`Unknown isolated database test: ${testName || "<missing>"}`);
    console.error(`Known tests: ${Object.keys(TESTS).join(", ")}`);
    process.exit(1);
  }

  const database = databaseUrlForPrismaFile(config.databaseFile);
  const keepFailedDatabase = process.env.KEEP_FAILED_TEST_DB === "1";
  const env = {
    ...process.env,
    DATABASE_URL: database.databaseUrl,
    NODE_ENV: "test",
    TEST_DATABASE_FILE: database.fileName,
  };

  cleanupSqliteFiles(database.absolutePath);

  let childStatus = 1;
  try {
    initializeTestDatabaseFromDevelopmentSchema(database.absolutePath);
    const [command, args] = config.command;
    const child = spawnSync(command, args, {
      cwd: REPO_ROOT,
      env,
      stdio: "inherit",
      shell: false,
    });
    childStatus = child.status ?? 1;
    if (child.error) throw child.error;
  } finally {
    if (childStatus === 0 || !keepFailedDatabase) {
      cleanupSqliteFiles(database.absolutePath);
    } else {
      console.warn(`Keeping failed isolated test database for debugging: ${database.fileName}`);
    }
  }

  process.exit(childStatus);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
