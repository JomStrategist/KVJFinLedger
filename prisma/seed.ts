import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const adminAccounts = [
    { name: "System Administrator", email: process.env.SEED_ADMIN_EMAIL || "admin@example.com", password: process.env.SEED_ADMIN_PASSWORD || "admin123" },
    { name: "Jomon Joseph", email: "info@thestrategist.co.in", password: "AjayThomas@1" },
  ];

  for (const admin of adminAccounts) {
    const hashedPassword = await bcrypt.hash(admin.password, 10);
    const existingAdmin = await prisma.user.findFirst({
      where: { email: admin.email },
    });

    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          name: admin.name,
          email: admin.email,
          password: hashedPassword,
          role: "ADMIN",
          roleTitle: "Administrator",
          isActive: true,
        },
      });
      console.log(`Seeded admin user: ${admin.email}`);
    } else {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          password: hashedPassword,
          isActive: true,
          role: "ADMIN",
        },
      });
      console.log(`Updated password for admin user ${admin.email}.`);
    }
  }

  const userAccounts = [
    { name: "Standard User", email: "user@example.com", password: "user123" },
    { name: "Ajay Thomas", email: "mail@thestrategist.co.in", password: "user123" },
  ];

  for (const user of userAccounts) {
    const existingUser = await prisma.user.findFirst({
      where: { email: user.email },
    });

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          password: hashedPassword,
          role: "USER",
          roleTitle: "Assigned User",
          isActive: true,
        },
      });
      console.log(`Seeded standard user: ${user.email}`);
    } else {
      console.log(`User ${user.email} already exists.`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
