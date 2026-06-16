const { assertIsolatedTestDatabase } = require("./lib/test-database-child-guard.cjs");

assertIsolatedTestDatabase();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const work = await prisma.work.create({
    data: {
      externalId: `TEST-RATING-OPENAI-${Date.now()}`,
      title: "Isolated OpenAI rating contract test work",
      author: "Codex Test",
      description: "Fixture for local rating run database contract tests.",
      category: "test",
    },
  });

  const supplement = await prisma.workRatingSupplement.create({
    data: {
      workId: work.id,
      sourceType: "manual",
      title: "DB contract test",
      content: "Temporary evidence",
      importance: "medium",
    },
  });
  const run = await prisma.workRatingRun.create({
    data: {
      workId: work.id,
      provider: "openai",
      rating: "B",
      score: 66,
      confidence: 0.72,
      renameSuggestion: "recommended",
      reasonJson: JSON.stringify({ reasonSummary: "DB contract test", operationAdvice: "Test only" }),
      risksJson: "[]",
      evidenceJson: "[]",
      evidenceWeightingJson: "[]",
      inputSnapshotJson: "{}",
      promptVersion: "rating-openai-v1-test",
      model: "test-model",
      status: "success",
    },
  });
  const projection = await prisma.workRating.create({
    data: {
      workId: work.id,
      rating: "B",
      score: 66,
      confidence: 0.72,
      reasonsJson: JSON.stringify(["DB contract test"]),
      risksJson: "[]",
      evidenceJson: "[]",
      renameSuggestion: "recommended",
      renameReason: "Test only",
      provider: "openai",
      ratingRunId: run.id,
    },
  });
  await prisma.workRatingRun.update({ where: { id: run.id }, data: { adopted: true } });
  const adopted = await prisma.workRatingRun.findUnique({ where: { id: run.id } });
  if (!adopted?.adopted) throw new Error("Rating run adoption contract failed.");
  if (!projection.id || !supplement.id) throw new Error("Rating projection or supplement was not created.");

  console.log("OpenAI rating DB contract passed in isolated database.");
}

main()
  .catch((error) => {
    console.error("OpenAI rating DB contract failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(process.exitCode ?? 0);
  });
