import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const club = await prisma.club.findFirst({ where: { name: "Padel Factory Carregado" } });
  if (!club) { console.log("No club found"); return; }

  // Add Campo 1 (GOOD) if missing
  const existing = await prisma.court.findFirst({ where: { clubId: club.id, name: "Campo 1" } });
  if (!existing) {
    await prisma.court.create({
      data: { clubId: club.id, name: "Campo 1", quality: "GOOD", orderIndex: -1, isAvailable: true },
    });
    console.log("Created Campo 1 (GOOD)");
  } else {
    console.log("Campo 1 already exists");
  }

  // Fix ordering: Campo 1-6
  const courts = await prisma.court.findMany({ where: { clubId: club.id }, orderBy: { name: "asc" } });
  for (let i = 0; i < courts.length; i++) {
    await prisma.court.update({ where: { id: courts[i].id }, data: { orderIndex: i } });
    console.log(`Set ${courts[i].name} orderIndex = ${i}, quality = ${courts[i].quality}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
