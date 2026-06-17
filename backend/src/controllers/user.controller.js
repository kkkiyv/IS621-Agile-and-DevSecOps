const { listCounsellors } = require("../services/counsellor.service");

const getCounsellors = async (_req, res) => {
  try {
    const counsellors = await listCounsellors();
    return res.json({ counsellors });
  } catch (err) {
    console.error("getCounsellors error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { getCounsellors };
