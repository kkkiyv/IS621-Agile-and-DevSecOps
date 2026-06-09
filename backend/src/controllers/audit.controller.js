const { prisma } = require("../prisma");
const { serializeAuditLog } = require("../services/audit.service");

const listAuditLogs = async (_req, res) => {
  try {
    const rows = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return res.json({
      logs: rows.map(serializeAuditLog),
    });
  } catch (err) {
    console.error("listAuditLogs error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { listAuditLogs };
