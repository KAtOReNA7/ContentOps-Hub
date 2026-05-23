const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const work = await prisma.work.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!work) {
    console.error("No Work record found. Import at least one work before running title intro DB test.");
    process.exitCode = 1;
    return;
  }

  const identification = await prisma.workIdentification.findFirst({
    where: { workId: work.id },
    orderBy: { createdAt: "desc" },
  });

  const rating = await prisma.workRating.findFirst({
    where: { workId: work.id },
    orderBy: { createdAt: "desc" },
  });

  const titleVariants = [
    {
      title: `${work.title}：测试优化标题`,
      sellingPoint: "测试卖点",
      targetAudience: "测试听众",
      reason: "数据库写入测试",
      risk: "测试记录，不代表真实生成结果",
      styleTag: "测试",
    },
  ];

  const generation = await prisma.workTitleIntroGeneration.create({
    data: {
      workId: work.id,
      identificationId: identification?.id ?? null,
      ratingId: rating?.id ?? null,
      shouldGenerateVariants: true,
      strategy: "rename_test",
      strategyReason: "db:test-title-intro test record",
      titleVariantsJson: JSON.stringify(titleVariants),
      introVariantJson: JSON.stringify({
        intro: "这是一条用于验证书名和简介生成结果保存能力的测试简介。",
        reason: "数据库写入测试",
        styleTag: "测试",
        risk: "测试记录，不代表真实生成结果",
      }),
      coverPromptsJson: JSON.stringify([
        {
          ratio: "1:1",
          prompt: "测试封面 prompt",
          reason: "数据库写入测试",
          risk: "测试记录，不生成图片",
        },
      ]),
      risksJson: JSON.stringify(["测试记录"]),
      evidenceJson: JSON.stringify(["db:test-title-intro"]),
    },
  });

  const found = await prisma.workTitleIntroGeneration.findUnique({
    where: { id: generation.id },
  });

  if (!found) {
    console.error("WorkTitleIntroGeneration insert failed: record was not found after create.");
    process.exitCode = 1;
    return;
  }

  const parsedTitleVariants = JSON.parse(found.titleVariantsJson);

  console.log(`Work id: ${work.id}`);
  console.log(`Generation id: ${found.id}`);
  console.log(`strategy: ${found.strategy}`);
  console.log(`titleVariants count: ${Array.isArray(parsedTitleVariants) ? parsedTitleVariants.length : 0}`);
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
