const { PrismaClient, Role, ReferralStatus } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo123!", 10);

  const teacherA = await prisma.user.upsert({
    where: { email: "teacher@casehub.demo" },
    update: {},
    create: {
      email: "teacher@casehub.demo",
      passwordHash,
      role: Role.TEACHER,
    },
  });

  const teacherB = await prisma.user.upsert({
    where: { email: "teacher2@casehub.demo" },
    update: {},
    create: {
      email: "teacher2@casehub.demo",
      passwordHash,
      role: Role.TEACHER,
    },
  });

  const counsellor = await prisma.user.upsert({
    where: { email: "counsellor@casehub.demo" },
    update: {},
    create: {
      email: "counsellor@casehub.demo",
      passwordHash,
      role: Role.COUNSELLOR,
    },
  });

  const existing = await prisma.referral.count();
  if (existing === 0) {
    await prisma.referral.createMany({
      data: [
        {
          submittedById: teacherA.id,
          studentName: "Alex Lim",
          nric: "S1234567D",
          description: "Concern about attendance drop this term.",
          category: "Welfare",
          urgency: "medium",
          status: ReferralStatus.SUBMITTED,
          triageRiskLevel: null,
          triageOutcome: null,
        },
        {
          submittedById: teacherA.id,
          studentName: "Sam Ong",
          nric: "T7654321Z",
          description: "Possible bullying reported by peers.",
          category: "Safeguarding",
          urgency: "high",
          status: ReferralStatus.IN_TRIAGE,
          triageRiskLevel: "HIGH",
          triageOutcome: "CREATE_CASE",
        },
        {
          submittedById: teacherB.id,
          studentName: "Jordan Tan",
          nric: "F1122334K",
          description: "Family stress affecting class participation.",
          category: "Wellbeing",
          urgency: "low",
          status: ReferralStatus.SUBMITTED,
        },
      ],
    });
  }

  console.log("Seed complete:", {
    teacher: teacherA.email,
    teacher2: teacherB.email,
    counsellor: counsellor.email,
    password: "demo123!",
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
