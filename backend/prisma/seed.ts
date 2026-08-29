import "dotenv/config";
import { prisma } from "../src/lib/prisma.ts";
import { hash } from "bcryptjs";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (email && password) {
    const name = "mainAdmin";

    const passwordHash = await hash(password, 10);

    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { name, email, passwordHash, role: "admin" },
    });
  } else {
    throw new Error("email or password unavaible");
  }
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
