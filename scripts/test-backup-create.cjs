const fs = require("node:fs");
const path = require("node:path");
const { createBackup } = require("./backup-create.cjs");
const {
  REPO_ROOT,
  cleanupSqliteFiles,
  databaseUrlForPrismaFile,
  initializeTestDatabaseFromDevelopmentSchema,
  sha256File,
} = require("./lib/database-safety.cjs");

async function main() {
  const source = databaseUrlForPrismaFile("test-backup-source.db");
  const outputRoot = path.join(REPO_ROOT, "backups", "test-backup-output");
  const uploadsSource = path.join(REPO_ROOT, "backups", "test-uploads-source");
  const timestamp = "backup-test";

  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.rmSync(uploadsSource, { recursive: true, force: true });
  cleanupSqliteFiles(source.absolutePath);

  try {
    const env = { ...process.env, DATABASE_URL: source.databaseUrl, NODE_ENV: "test", TEST_DATABASE_FILE: source.fileName };
    initializeTestDatabaseFromDevelopmentSchema(source.absolutePath);
    await seedSourceDatabase(env);
    fs.mkdirSync(path.join(uploadsSource, "covers"), { recursive: true });
    fs.writeFileSync(path.join(uploadsSource, "covers", "fixture.txt"), "upload fixture", "utf8");
    fs.writeFileSync(path.join(uploadsSource, ".env"), "SECRET=do-not-copy", "utf8");

    const result = await createBackup({
      sourceDatabasePath: source.absolutePath,
      outputRoot,
      uploadsSource,
      timestamp,
      logicalName: "test",
    });

    const manifestPath = path.join(result.backupDir, "manifest.json");
    assert(fs.existsSync(manifestPath), "Manifest was not written.");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const backupDb = path.join(result.backupDir, "dev.db");
    assert(manifest.status === "success", "Manifest status should be success.");
    assert(manifest.database.integrityCheck === "ok", "Backup integrity should pass.");
    assert(manifest.database.sha256 === sha256File(backupDb), "Manifest hash should match backup database.");
    assert(fs.existsSync(path.join(result.backupDir, "uploads", "covers", "fixture.txt")), "Uploads fixture was not copied.");
    assert(!fs.existsSync(path.join(result.backupDir, "uploads", ".env")), ".env must not be copied into backups.");
    assert(!JSON.stringify(manifest).includes("do-not-copy"), "Manifest must not include secret fixture content.");

    let conflictFailed = false;
    try {
      await createBackup({ sourceDatabasePath: source.absolutePath, outputRoot, uploadsSource, timestamp, logicalName: "test" });
    } catch {
      conflictFailed = true;
    }
    assert(conflictFailed, "Backup must refuse to overwrite an existing timestamp directory.");

    let missingSourceFailed = false;
    try {
      await createBackup({
        sourceDatabasePath: path.join(REPO_ROOT, "prisma", "test-missing-source.db"),
        outputRoot,
        uploadsSource,
        timestamp: "backup-missing-source",
        logicalName: "test",
      });
    } catch {
      missingSourceFailed = true;
    }
    assert(missingSourceFailed, "Backup must fail for missing source database.");
    assert(!fs.existsSync(path.join(outputRoot, "backup-missing-source", "manifest.json")), "Failed backup must not leave a success manifest.");

    console.log("Backup create tests passed.");
  } finally {
    fs.rmSync(outputRoot, { recursive: true, force: true });
    fs.rmSync(uploadsSource, { recursive: true, force: true });
    cleanupSqliteFiles(source.absolutePath);
  }
}

async function seedSourceDatabase(env) {
  process.env.DATABASE_URL = env.DATABASE_URL;
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    await prisma.work.create({
      data: {
        externalId: `TEST-BACKUP-${Date.now()}`,
        title: "Backup source fixture",
        author: "Codex Test",
        description: "Fixture in isolated backup test database.",
        category: "test",
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
