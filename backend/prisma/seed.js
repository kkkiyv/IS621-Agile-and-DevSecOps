const { PrismaClient, Role, ReferralStatus, RiskLevel } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo123!", 10);

  const teacher = await prisma.user.upsert({
    where: { email: "teacher@casehub.demo" },
    update: { name: "Sarah Johnson" },
    create: {
      email: "teacher@casehub.demo",
      passwordHash,
      name: "Sarah Johnson",
      role: Role.TEACHER,
    },
  });

  await prisma.user.upsert({
    where: { email: "teacher2@casehub.demo" },
    update: {},
    create: {
      email: "teacher2@casehub.demo",
      passwordHash,
      name: "Alex Chen",
      role: Role.TEACHER,
    },
  });

  const counsellor = await prisma.user.upsert({
    where: { email: "counsellor@casehub.demo" },
    update: { name: "Michael Chen" },
    create: {
      email: "counsellor@casehub.demo",
      passwordHash,
      name: "Michael Chen",
      role: Role.COUNSELLOR,
    },
  });

  await prisma.user.upsert({
    where: { email: "lead@casehub.demo" },
    update: { name: "Jordan Park" },
    create: {
      email: "lead@casehub.demo",
      passwordHash,
      name: "Jordan Park",
      role: Role.LEAD_ADMIN,
    },
  });

  const existing = await prisma.referral.count();
  if (existing === 0) {
    const elevenDaysAgo = new Date(Date.now() - 11 * 24 * 60 * 60 * 1000);
    const nineDaysAgo = new Date(Date.now() - 9 * 24 * 60 * 60 * 1000);
    const twelveDaysAgo = new Date(Date.now() - 12 * 24 * 60 * 60 * 1000);

    await prisma.referral.create({
      data: {
        submittedById: teacher.id,
        studentName: "Alex Martinez",
        concern: "Behavioral concerns",
        description:
          "Student has been increasingly disruptive in class, showing signs of frustration.",
        status: ReferralStatus.SUBMITTED,
        createdAt: nineDaysAgo,
      },
    });

    await prisma.referral.create({
      data: {
        submittedById: teacher.id,
        studentName: "Jamie Lee",
        concern: "Academic performance",
        description: "Sudden drop in grades and missing assignments.",
        status: ReferralStatus.IN_REVIEW,
        riskLevel: RiskLevel.MEDIUM,
        triageNotes:
          "Will create case and monitor academic progress closely.",
        triagedById: counsellor.id,
        triagedAt: elevenDaysAgo,
        createdAt: twelveDaysAgo,
      },
    });
  }

  console.log("Seed complete (password: demo123!):", {
    teacher: teacher.email,
    counsellor: counsellor.email,
    lead: "lead@casehub.demo",
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
