const { assertIsolatedTestDatabase } = require("./lib/test-database-child-guard.cjs");

assertIsolatedTestDatabase();

const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  const externalId = `TEST-IMPORT-${Date.now()}`;

  try {
    await prisma.$connect();

    const created = await prisma.work.create({
      data: {
        externalId,
        title: "Isolated import test work",
        author: "Codex Test",
        description: "Fixture created inside an isolated SQLite test database.",
        coverFileName: "test-cover.jpg",
        category: "test",
        currentPlays: 1234,
        currentCtr: 0.12,
        currentFinish: 0.34,
        notes: "isolated db:test-import fixture",
        status: "imported",
      },
      select: {
        id: true,
        externalId: true,
        title: true,
      },
    });

    const found = await prisma.work.findFirst({
      where: { externalId },
      select: {
        id: true,
        externalId: true,
        title: true,
        currentCtr: true,
        currentFinish: true,
      },
    });

    if (!found) throw new Error("Inserted Work was not found.");
    if (found.id !== created.id) throw new Error("Inserted Work id mismatch.");

    console.log("Import DB test inserted fixture in isolated database.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
