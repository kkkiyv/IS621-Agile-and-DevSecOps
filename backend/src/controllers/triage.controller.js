const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const getReferrals = async (req, res) => {
  try {
    const referrals = await prisma.referral.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(referrals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const triageReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const { riskLevel, notes } = req.body;

    const referral = await prisma.referral.update({
      where: { id },
      data: {
        riskLevel,
        status: 'IN_REVIEW',
        ...(notes && { description: notes }),
      },
    });

    res.status(200).json({ message: 'Referral triaged successfully', referral });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getReferrals, triageReferral };
