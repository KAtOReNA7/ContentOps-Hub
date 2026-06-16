const fs = require("node:fs");
const path = require("node:path");
const {
  REPO_ROOT,
  assertDevelopmentDatabasePath,
  collectDatabaseSnapshot,
  loadEnvFilesWithoutOverride,
  resolveSqliteFileFromDatabaseUrl,
  safeJsonWrite,
  sha256File,
} = require("./lib/database-safety.cjs");

async function createBackup(options = {}) {
  const sourceDatabasePath = path.resolve(options.sourceDatabasePath);
  const outputRoot = path.resolve(options.outputRoot || path.join(REPO_ROOT, "backups"));
  const uploadsSource = options.uploadsSource ? path.resolve(options.uploadsSource) : path.join(REPO_ROOT, "uploads");
  const timestamp = options.timestamp || timestampForFile();
  const backupDir = path.join(outputRoot, timestamp);
  const databaseBackupPath = path.join(backupDir, "dev.db");
  const uploadsBackupPath = path.join(backupDir, "uploads");

  if (!fs.existsSync(sourceDatabasePath)) throw new Error("Source database does not exist.");
  if (fs.existsSync(backupDir)) throw new Error("Backup target already exists; refusing to overwrite.");

  fs.mkdirSync(outputRoot, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: false });

  const previousDatabaseUrl = process.env.DATABASE_URL;
  try {
    process.env.DATABASE_URL = sqliteUrlForAbsolutePath(sourceDatabasePath);
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();
    try {
      await vacuumInto(prisma, databaseBackupPath);
    } finally {
      await prisma.$disconnect();
    }

    process.env.DATABASE_URL = sqliteUrlForAbsolutePath(databaseBackupPath);
    const verifyPrisma = new PrismaClient();
    let backupSnapshot;
    try {
      backupSnapshot = await collectDatabaseSnapshot(verifyPrisma, databaseBackupPath, {
        logicalName: "backup",
      });
    } finally {
      await verifyPrisma.$disconnect();
    }

    if (backupSnapshot.integrityCheck !== "ok") {
      throw new Error("Backup database integrity check failed.");
    }

    const uploadsSummary = copyUploads(uploadsSource, uploadsBackupPath);
    const configTemplates = copyConfigTemplates(backupDir);
    const manifest = {
      status: "success",
      createdAt: new Date().toISOString(),
      gitHead: backupSnapshot.gitHead,
      source: {
        logicalDatabase: options.logicalName || "development",
        databaseFileName: path.basename(sourceDatabasePath),
      },
      database: {
        fileName: "dev.db",
        sizeBytes: fs.statSync(databaseBackupPath).size,
        sha256: sha256File(databaseBackupPath),
        integrityCheck: backupSnapshot.integrityCheck,
      },
      uploads: uploadsSummary,
      configTemplates,
      exclusions: [".env", ".env.local", ".env.*.local", "API keys", "local absolute paths"],
      baseline: {
        tableCounts: backupSnapshot.tableCounts,
        tableDigests: backupSnapshot.tableDigests,
        schemaSha256: backupSnapshot.schemaSha256,
      },
    };

    safeJsonWrite(path.join(backupDir, "manifest.json"), manifest);
    return { backupDir, manifest };
  } catch (error) {
    fs.rmSync(backupDir, { recursive: true, force: true });
    throw error;
  } finally {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  }
}

async function vacuumInto(prisma, outputPath) {
  const escaped = outputPath.replace(/'/gu, "''");
  await prisma.$executeRawUnsafe(`VACUUM INTO '${escaped}'`);
}

function copyUploads(source, target) {
  if (!fs.existsSync(source)) {
    return { copied: false, fileCount: 0, totalBytes: 0, note: "uploads directory not found" };
  }

  const files = listFiles(source);
  fs.mkdirSync(target, { recursive: true });
  let totalBytes = 0;
  let copiedCount = 0;
  for (const file of files) {
    const relative = path.relative(source, file);
    if (isSecretLikeFile(relative)) continue;
    const destination = path.join(target, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(file, destination);
    totalBytes += fs.statSync(file).size;
    copiedCount += 1;
  }

  return { copied: true, fileCount: copiedCount, totalBytes };
}

function listFiles(dir) {
  const output = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...listFiles(fullPath));
    else if (entry.isFile()) output.push(fullPath);
  }
  return output;
}

function isSecretLikeFile(relativePath) {
  return relativePath
    .split(/[\\/]/u)
    .some((part) => part === ".env" || part === ".env.local" || /^\.env\..*\.local$/u.test(part));
}

function copyConfigTemplates(backupDir) {
  const copied = [];
  const envExample = path.join(REPO_ROOT, ".env.example");
  if (fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, path.join(backupDir, ".env.example"));
    copied.push(".env.example");
  }
  return copied;
}

function sqliteUrlForAbsolutePath(filePath) {
  return `file:${path.resolve(filePath).replace(/\\/gu, "/")}`;
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/gu, "-");
}

async function main() {
  loadEnvFilesWithoutOverride();
  const sourceDatabasePath = assertDevelopmentDatabasePath(resolveSqliteFileFromDatabaseUrl(process.env.DATABASE_URL));
  const result = await createBackup({ sourceDatabasePath, logicalName: "development" });
  console.log("Backup created.");
  console.log(`Output: ${path.relative(REPO_ROOT, result.backupDir).replace(/\\/gu, "/")}`);
  console.log(`Database SHA-256: ${result.manifest.database.sha256}`);
  console.log(`Integrity check: ${result.manifest.database.integrityCheck}`);
  console.log(`Uploads copied: ${result.manifest.uploads.copied ? "yes" : "no"}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Backup failed:");
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  createBackup,
};
