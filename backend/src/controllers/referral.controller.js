const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const createReferral = async (req, res) => {
  try {
    const { studentName, studentId, concern, description } = req.body;

    const referral = await prisma.referral.create({
      data: {
        studentName,
        studentId,
        concern,
        description,
        submittedBy: req.user.id,
        status: 'PENDING',
      },
    });

    res.status(201).json({ message: 'Referral submitted successfully', referral });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { createReferral };
