const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const PRISMA_DIR = path.join(REPO_ROOT, "prisma");
const DEV_DB_NAME = "dev.db";
const MAIN_TABLES = [
  "Work",
  "BatchJob",
  "BatchJobItem",
  "WorkIdentification",
  "WorkRating",
  "WorkRatingRun",
  "WorkTitleIntroGeneration",
  "WorkCoverEvaluation",
  "WorkCoverRender",
  "CoverAsset",
];
const ALL_SNAPSHOT_TABLES = [
  "AnalysisResult",
  "BatchJob",
  "BatchJobItem",
  "CoverAsset",
  "Work",
  "WorkCoverEvaluation",
  "WorkCoverRender",
  "WorkExperimentResult",
  "WorkExperimentReview",
  "WorkFeedbackInsight",
  "WorkIdentification",
  "WorkRating",
  "WorkRatingRun",
  "WorkRatingSupplement",
  "WorkTitleIntroGeneration",
];
const SQLITE_SUFFIXES = ["", "-wal", "-shm", "-journal"];

function loadEnvFilesWithoutOverride(fileNames = [".env", ".env.local"]) {
  for (const fileName of fileNames) {
    const filePath = path.join(REPO_ROOT, fileName);
    if (!fs.existsSync(filePath)) continue;
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/u);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  }
}

function resolveSqliteFileFromDatabaseUrl(databaseUrl) {
  if (!databaseUrl || typeof databaseUrl !== "string") {
    throw new Error("DATABASE_URL is not set.");
  }

  if (!databaseUrl.startsWith("file:")) {
    throw new Error("Only SQLite file: DATABASE_URL values are supported by local database safety scripts.");
  }

  const rawPath = databaseUrl.slice("file:".length).split("?")[0];
  if (!rawPath) {
    throw new Error("DATABASE_URL file path is empty.");
  }

  const unquoted = rawPath.replace(/^['"]|['"]$/g, "");
  const normalized = unquoted.replace(/\//g, path.sep);
  return path.resolve(PRISMA_DIR, normalized);
}

function isPathInside(child, parent) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertAllowedTestDatabasePath(databasePath) {
  const resolved = path.resolve(databasePath);
  const fileName = path.basename(resolved);

  if (!isPathInside(resolved, PRISMA_DIR)) {
    throw new Error("Refusing to use a test database outside prisma/.");
  }

  if (fileName === DEV_DB_NAME) {
    throw new Error("Refusing to use prisma/dev.db for an automated database test.");
  }

  if (!/^test(?:-[A-Za-z0-9_.-]+)?\.db$/u.test(fileName)) {
    throw new Error("Refusing to use a non-whitelisted test database name.");
  }

  return resolved;
}

function assertDevelopmentDatabasePath(databasePath) {
  const resolved = path.resolve(databasePath);
  if (!isPathInside(resolved, PRISMA_DIR) || path.basename(resolved) !== DEV_DB_NAME) {
    throw new Error("Development database must resolve to prisma/dev.db.");
  }
  return resolved;
}

function databaseUrlForPrismaFile(fileName) {
  const resolved = assertAllowedTestDatabasePath(path.join(PRISMA_DIR, fileName));
  return {
    fileName: path.basename(resolved),
    absolutePath: resolved,
    databaseUrl: `file:./${path.basename(resolved)}`,
  };
}

function cleanupSqliteFiles(databasePath) {
  const resolved = assertAllowedTestDatabasePath(databasePath);
  for (const suffix of SQLITE_SUFFIXES) {
    const target = `${resolved}${suffix}`;
    if (fs.existsSync(target)) {
      fs.rmSync(target, { force: true });
    }
  }
}

function initializeTestDatabaseFromDevelopmentSchema(testDatabasePath) {
  const target = assertAllowedTestDatabasePath(testDatabasePath);
  const source = assertDevelopmentDatabasePath(path.join(PRISMA_DIR, DEV_DB_NAME));
  cleanupSqliteFiles(target);

  const script = String.raw`
import sqlite3
import sys

source, target = sys.argv[1], sys.argv[2]
src = sqlite3.connect("file:" + source.replace("\\", "/") + "?mode=ro", uri=True)
dst = sqlite3.connect(target)
try:
    rows = src.execute(
        "SELECT type, name, tbl_name, sql FROM sqlite_master "
        "WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' "
        "ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 WHEN 'trigger' THEN 2 ELSE 3 END, name"
    ).fetchall()
    for _type, name, _tbl_name, sql in rows:
        dst.execute(sql)
    dst.commit()
    result = dst.execute("PRAGMA integrity_check").fetchone()[0]
    if result != "ok":
        raise RuntimeError("integrity_check failed: " + str(result))
finally:
    src.close()
    dst.close()
`;

  const result = spawnSync("python", ["-", source, target], {
    input: script,
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Failed to initialize isolated test database schema: ${result.stderr || result.stdout}`);
  }
}

function sqliteSidecarState(databasePath) {
  const resolved = path.resolve(databasePath);
  return {
    wal: fs.existsSync(`${resolved}-wal`),
    shm: fs.existsSync(`${resolved}-shm`),
    journal: fs.existsSync(`${resolved}-journal`),
  };
}

function sha256File(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function sha256Text(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

async function collectDatabaseSnapshot(prisma, databasePath, options = {}) {
  const logicalName = options.logicalName || "development";
  const resolvedPath = path.resolve(databasePath);
  const fileExists = fs.existsSync(resolvedPath);
  const tableNames = options.tables || ALL_SNAPSHOT_TABLES;
  const schemaPath = path.join(PRISMA_DIR, "schema.prisma");
  const schemaText = fs.readFileSync(schemaPath, "utf8");

  let integrityCheck = "not_checked";
  try {
    const integrity = await prisma.$queryRawUnsafe("PRAGMA integrity_check");
    integrityCheck = Array.isArray(integrity) && integrity[0] ? String(Object.values(integrity[0])[0]) : "unknown";
  } catch (error) {
    integrityCheck = `error:${error.constructor?.name || "Error"}`;
  }

  const tableCounts = {};
  const tableDigests = {};
  const maxUpdatedAt = {};

  for (const table of tableNames) {
    try {
      const countRows = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS count FROM "${table}"`);
      tableCounts[table] = Number(countRows[0]?.count ?? 0);
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}" ORDER BY id ASC`);
      tableDigests[table] = digestRows(rows);
      maxUpdatedAt[table] = maxTimeValue(rows, "updatedAt") || maxTimeValue(rows, "createdAt") || null;
    } catch {
      tableCounts[table] = null;
      tableDigests[table] = null;
      maxUpdatedAt[table] = null;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    logicalDatabase: logicalName,
    databaseFileName: path.basename(resolvedPath),
    fileExists,
    fileSizeBytes: fileExists ? fs.statSync(resolvedPath).size : null,
    sha256: sha256File(resolvedPath),
    sqliteSidecars: sqliteSidecarState(resolvedPath),
    integrityCheck,
    tableCounts,
    tableDigests,
    maxUpdatedAt,
    schemaSha256: sha256Text(schemaText),
    gitHead: getGitHead(),
  };
}

function digestRows(rows) {
  const projected = rows.map((row) => {
    const output = {};
    for (const [key, value] of Object.entries(row)) {
      if (["id", "workId", "batchJobId", "status", "rating", "score", "createdAt", "updatedAt", "externalId", "reviewStatus"].includes(key)) {
        output[key] = normalizeValue(value);
      }
    }
    return output;
  });
  return sha256Text(JSON.stringify(projected));
}

function normalizeValue(value) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  return value;
}

function maxTimeValue(rows, key) {
  const values = rows.map((row) => row[key]).filter(Boolean).map((value) => normalizeValue(value)).sort();
  return values.length ? values[values.length - 1] : null;
}

function getGitHead() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

function compareDevelopmentSnapshots(before, after) {
  const changedTables = [];
  const allTables = Array.from(new Set([...Object.keys(before.tableCounts || {}), ...Object.keys(after.tableCounts || {})])).sort();
  for (const table of allTables) {
    if (before.tableCounts[table] !== after.tableCounts[table] || before.tableDigests[table] !== after.tableDigests[table]) {
      changedTables.push(table);
    }
  }

  return {
    unchanged: changedTables.length === 0 && before.integrityCheck === "ok" && after.integrityCheck === "ok",
    changedTables,
    fileHashChanged: before.sha256 !== after.sha256,
    fileSizeChanged: before.fileSizeBytes !== after.fileSizeBytes,
    beforeSha256: before.sha256,
    afterSha256: after.sha256,
  };
}

function safeJsonWrite(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

module.exports = {
  ALL_SNAPSHOT_TABLES,
  DEV_DB_NAME,
  MAIN_TABLES,
  PRISMA_DIR,
  REPO_ROOT,
  SQLITE_SUFFIXES,
  assertAllowedTestDatabasePath,
  assertDevelopmentDatabasePath,
  cleanupSqliteFiles,
  collectDatabaseSnapshot,
  compareDevelopmentSnapshots,
  databaseUrlForPrismaFile,
  initializeTestDatabaseFromDevelopmentSchema,
  loadEnvFilesWithoutOverride,
  resolveSqliteFileFromDatabaseUrl,
  safeJsonWrite,
  sha256File,
  sha256Text,
  sqliteSidecarState,
};
