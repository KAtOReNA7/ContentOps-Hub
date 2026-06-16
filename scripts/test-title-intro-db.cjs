const { assertIsolatedTestDatabase } = require("./lib/test-database-child-guard.cjs");

assertIsolatedTestDatabase();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const work = await prisma.work.create({
    data: {
      externalId: `TEST-TITLE-INTRO-${Date.now()}`,
      title: "Isolated title intro test work",
      author: "Codex Test",
      description: "Fixture for title intro persistence tests.",
      category: "test",
    },
  });

  const identification = await prisma.workIdentification.create({
    data: {
      workId: work.id,
      confidence: 0.9,
      finalMatchJson: JSON.stringify({ title: work.title, author: work.author }),
      reason: "isolated fixture",
      risksJson: "[]",
      evidenceJson: JSON.stringify(["isolated fixture"]),
      candidatesJson: "[]",
      searchProvider: "mock",
      searchQuery: work.title,
      searchResultsJson: "[]",
      riskHintsJson: "[]",
    },
  });

  const rating = await prisma.workRating.create({
    data: {
      workId: work.id,
      rating: "B",
      score: 66,
      confidence: 0.78,
      reasonsJson: JSON.stringify(["isolated rating"]),
      risksJson: "[]",
      evidenceJson: "[]",
      renameSuggestion: "recommended",
      renameReason: "isolated test",
    },
  });

  const titleVariants = [
    {
      title: `${work.title}: optimized`,
      sellingPoint: "test selling point",
      targetAudience: "test audience",
      reason: "database write test",
      risk: "test-only record",
      styleTag: "test",
    },
  ];

  const generation = await prisma.workTitleIntroGeneration.create({
    data: {
      workId: work.id,
      identificationId: identification.id,
      ratingId: rating.id,
      shouldGenerateVariants: true,
      strategy: "rename_test",
      strategyReason: "isolated db:test-title-intro record",
      titleVariantsJson: JSON.stringify(titleVariants),
      introVariantJson: JSON.stringify({
        intro: "Short test intro stored inside an isolated database.",
        reason: "database write test",
        styleTag: "test",
        risk: "test-only record",
      }),
      coverPromptsJson: JSON.stringify([
        {
          ratio: "1:1",
          prompt: "test cover prompt",
          reason: "database write test",
          risk: "does not generate images",
        },
      ]),
      risksJson: JSON.stringify(["test-only record"]),
      evidenceJson: JSON.stringify(["isolated db:test-title-intro"]),
    },
  });

  const found = await prisma.workTitleIntroGeneration.findUnique({
    where: { id: generation.id },
  });

  if (!found) throw new Error("WorkTitleIntroGeneration insert failed.");

  const parsedTitleVariants = JSON.parse(found.titleVariantsJson);
  if (!Array.isArray(parsedTitleVariants) || parsedTitleVariants.length !== 1) {
    throw new Error("Stored title variants were not preserved.");
  }

  console.log("Title intro generation DB test passed in isolated database.");
}

main()
  .catch((error) => {
    console.error("Title intro generation DB test failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(process.exitCode ?? 0);
  });
