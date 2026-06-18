const { listCaseOwners } = require("../services/counsellor.service");

const getCaseOwners = async (_req, res) => {
  try {
    const owners = await listCaseOwners();
    return res.json({ owners, counsellors: owners });
  } catch (err) {
    console.error("getCaseOwners error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/** @deprecated use getCaseOwners */
const getCounsellors = getCaseOwners;

module.exports = { getCaseOwners, getCounsellors };
