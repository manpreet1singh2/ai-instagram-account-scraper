import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const adminPassword = await bcrypt.hash("Admin@12345", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@igintel.io" },
    update: {},
    create: {
      email: "admin@igintel.io",
      passwordHash: adminPassword,
      name: "Admin User",
      role: "ADMIN",
      plan: "ENTERPRISE",
      monthlyQuota: 99999,
    },
  });

  const demoPassword = await bcrypt.hash("Demo@12345", 12);
  const demo = await prisma.user.upsert({
    where: { email: "demo@igintel.io" },
    update: {},
    create: {
      email: "demo@igintel.io",
      passwordHash: demoPassword,
      name: "Demo User",
      role: "USER",
      plan: "PRO",
      monthlyQuota: 10000,
    },
  });

  console.log(`✅ Admin: ${admin.email}`);
  console.log(`✅ Demo:  ${demo.email} (password: Demo@12345)`);
  console.log("🌱 Seeding complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
