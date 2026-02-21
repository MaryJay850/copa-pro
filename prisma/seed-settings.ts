import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

const defaultSettings = [
  { key: "POINTS_WIN", value: "3", label: "Pontos por vitória", type: "number" },
  { key: "POINTS_SET", value: "2", label: "Pontos por set ganho", type: "number" },
  { key: "POINTS_DRAW", value: "1", label: "Pontos por empate", type: "number" },
  { key: "ELO_K_FACTOR", value: "32", label: "Fator K do Elo", type: "number" },
  { key: "ELO_DEFAULT", value: "1200", label: "Elo inicial", type: "number" },
  { key: "NOTIFICATION_POLL_INTERVAL", value: "30", label: "Intervalo polling notificações (seg)", type: "number" },
];

async function seedSettings() {
  console.log("Seeding default system settings...");
  for (const setting of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log(`Seeded ${defaultSettings.length} settings.`);
}

seedSettings()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
