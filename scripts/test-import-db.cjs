const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  const externalId = `TEST-IMPORT-${Date.now()}`;

  try {
    await prisma.$connect();

    const created = await prisma.work.create({
      data: {
        externalId,
        title: "导入链路测试作品",
        author: "测试作者",
        description: "用于验证批量导入阶段 Work 写入字段是否可用。",
        coverFileName: "test-cover.jpg",
        category: "测试品类",
        currentPlays: 1234,
        currentCtr: 0.12,
        currentFinish: 0.34,
        notes: "db:test-import 自动插入",
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

    if (!found) {
      throw new Error("Inserted Work was not found");
    }

    console.log("Import DB test inserted", JSON.stringify({ created, found }));
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
