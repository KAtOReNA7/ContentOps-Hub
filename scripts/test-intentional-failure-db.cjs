const { assertIsolatedTestDatabase } = require("./lib/test-database-child-guard.cjs");

assertIsolatedTestDatabase();

const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.work.create({
      data: {
        externalId: `TEST-FAILURE-${Date.now()}`,
        title: "Intentional failure fixture",
        author: "Codex Test",
        description: "This record must be isolated from dev.db and cleaned with the test database.",
        category: "test",
      },
    });
    throw new Error("Intentional isolated database failure.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(7);
});
