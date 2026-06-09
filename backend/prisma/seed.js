const {
  PrismaClient,
  Role,
  ReferralStatus,
  RiskLevel,
  CaseStatus,
} = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {

  const teacher = await prisma.user.upsert({
    where: { email: "ghimchong96+teacher@gmail.com" },
    update: { name: "Sarah Johnson" },
    create: {
      email: "ghimchong96+teacher@gmail.com",
      name: "Sarah Johnson",
      role: Role.TEACHER,
    },
  });

  await prisma.user.upsert({
    where: { email: "ghimchong96+teacher2@gmail.com" },
    update: {},
    create: {
      email: "ghimchong96+teacher2@gmail.com",
      name: "Alex Chen",
      role: Role.TEACHER,
    },
  });

  const counsellor = await prisma.user.upsert({
    where: { email: "ghimchong96+counsellor@gmail.com" },
    update: { name: "Michael Chen" },
    create: {
      email: "ghimchong96+counsellor@gmail.com",
      name: "Michael Chen",
      role: Role.COUNSELLOR,
    },
  });

  await prisma.user.upsert({
    where: { email: "ghimchong96+lead@gmail.com" },
    update: { name: "Jordan Park" },
    create: {
      email: "ghimchong96+lead@gmail.com",
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

  let jamieReferral = await prisma.referral.findFirst({
    where: { studentName: "Jamie Lee" },
  });

  if (!jamieReferral) {
    jamieReferral = await prisma.referral.create({
      data: {
        submittedById: teacher.id,
        studentName: "Jamie Lee",
        concern: "Academic performance",
        description: "Sudden drop in grades and missing assignments.",
        status: ReferralStatus.CASE_OPENED,
        riskLevel: RiskLevel.MEDIUM,
        triageNotes: "Will create case and monitor academic progress closely.",
        triagedById: counsellor.id,
        triagedAt: new Date("2026-05-01T10:00:00"),
        createdAt: new Date("2026-04-28T09:00:00"),
      },
    });
  } else {
    jamieReferral = await prisma.referral.update({
      where: { id: jamieReferral.id },
      data: {
        status: ReferralStatus.CASE_OPENED,
        riskLevel: RiskLevel.MEDIUM,
        triageNotes: "Will create case and monitor academic progress closely.",
        triagedById: counsellor.id,
        triagedAt: jamieReferral.triagedAt ?? new Date("2026-05-01T10:00:00"),
      },
    });
  }

  const jamieCase = await prisma.case.upsert({
    where: { referralId: jamieReferral.id },
    update: { assignedToId: counsellor.id, status: CaseStatus.OPEN },
    create: {
      referralId: jamieReferral.id,
      assignedToId: counsellor.id,
      status: CaseStatus.OPEN,
    },
  });

  const demoTasks = [
    {
      title: "Review recent assignments",
      description: null,
      completed: true,
      dueDate: new Date("2026-05-10T12:00:00"),
    },
    {
      title: "Schedule parent meeting",
      description: "Discuss academic concerns with parents",
      completed: false,
      dueDate: new Date("2026-05-15T16:00:00"),
    },
  ];

  for (const task of demoTasks) {
    const existing = await prisma.task.findFirst({
      where: { caseId: jamieCase.id, title: task.title },
    });
    if (!existing) {
      await prisma.task.create({
        data: {
          ...task,
          caseId: jamieCase.id,
          assignedToId: counsellor.id,
        },
      });
    }
  }

  const auditCount = await prisma.auditLog.count();
  if (auditCount === 0) {
    await prisma.auditLog.createMany({
      data: [
        {
          action: "REFERRAL_CREATED",
          details: `Referral created for Jamie Lee - Academic performance`,
          recordId: jamieReferral.id,
          recordType: "referral",
          userId: teacher.id,
          createdAt: new Date("2026-05-05T14:20:00"),
        },
        {
          action: "REFERRAL_TRIAGED",
          details: "Referral triaged - Risk: medium, Outcome: create_case",
          recordId: jamieReferral.id,
          recordType: "referral",
          userId: counsellor.id,
          createdAt: new Date("2026-05-06T10:15:00"),
        },
        {
          action: "CASE_CREATED",
          details: "Case created for Jamie Lee",
          recordId: jamieCase.id,
          recordType: "case",
          userId: counsellor.id,
          createdAt: new Date("2026-05-06T10:20:00"),
        },
      ],
    });
  }

  console.log("Seed complete:", {
    teacher: teacher.email,
    counsellor: counsellor.email,
    lead: "ghimchong96+lead@gmail.com",
    demoCase: jamieCase.id,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
