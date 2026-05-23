const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();

    const work = await prisma.work.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!work) {
      console.error("No Work found. Please import a Work before running db:test-rating.");
      process.exitCode = 1;
      return;
    }

    const rating = await prisma.workRating.create({
      data: {
        workId: work.id,
        rating: "B",
        score: 66,
        confidence: 0.78,
        reasonsJson: JSON.stringify(["测试评级写入"]),
        risksJson: JSON.stringify(["测试风险"]),
        evidenceJson: JSON.stringify(["测试证据"]),
        renameSuggestion: "recommended",
        renameReason: "测试多书名建议",
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

    if (!found) {
      throw new Error("Inserted WorkRating was not found");
    }

    console.log(
      "Rating DB test inserted",
      JSON.stringify({
        workId: rating.workId,
        ratingId: rating.id,
        rating: found.rating,
        score: found.score,
      }),
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    process.exit(process.exitCode ?? 0);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
  process.exit(process.exitCode);
});
