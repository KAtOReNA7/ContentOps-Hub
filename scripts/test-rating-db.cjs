const { assertIsolatedTestDatabase } = require("./lib/test-database-child-guard.cjs");

assertIsolatedTestDatabase();

const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();

    const work = await prisma.work.create({
      data: {
        externalId: `TEST-RATING-${Date.now()}`,
        title: "Isolated rating test work",
        author: "Codex Test",
        description: "Fixture created for WorkRating persistence tests.",
        category: "test",
      },
      select: { id: true },
    });

    const rating = await prisma.workRating.create({
      data: {
        workId: work.id,
        rating: "B",
        score: 66,
        confidence: 0.78,
        reasonsJson: JSON.stringify(["isolated rating write"]),
        risksJson: JSON.stringify(["test risk"]),
        evidenceJson: JSON.stringify(["test evidence"]),
        renameSuggestion: "recommended",
        renameReason: "isolated test",
      },
      select: {
        id: true,
        workId: true,
        rating: true,
        score: true,
      },
    });

    const found = await prisma.workRating.findUnique({
      where: { id: rating.id },
      select: {
        id: true,
        rating: true,
        score: true,
      },
    });

    if (!found) throw new Error("Inserted WorkRating was not found.");
    if (found.rating !== "B" || found.score !== 66) throw new Error("Inserted WorkRating values were not preserved.");

    console.log("Rating DB test inserted fixture in isolated database.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
