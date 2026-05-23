const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.work.count();
  console.log(`Prisma connected. Work count: ${count}`);
}

main()
  .catch((error) => {
    console.error("Prisma connection test failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(process.exitCode ?? 0);
  });
