import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const email = "info@thestrategist.co.in";
  const password = "AjayThomas@1";
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      isActive: true,
      role: "ADMIN",
    },
    create: {
      name: "Jomon Joseph",
      email,
      password: hashedPassword,
      role: "ADMIN",
      roleTitle: "Administrator",
      isActive: true,
    },
  });

  console.log(`Successfully updated password for ${user.email}`);
}

main()
  .catch((e) => {
    console.error("Error updating user:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
