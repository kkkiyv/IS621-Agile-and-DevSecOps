const { validationResult } = require("express-validator");
const {
  createReferralValidator,
  triageReferralValidator,
} = require("../../src/validators/referral.validator");

async function runValidators(validators, body) {
  const req = { body, headers: {}, params: {}, query: {} };
  for (const validator of validators) {
    await validator(req, {}, () => {});
  }
  return validationResult(req);
}

// ── Tests 1–3: Referral creation validation ───────────────────────────────────

describe("Referral Creation Validation", () => {
  test("Test 1: empty required fields are rejected", async () => {
    const result = await runValidators(createReferralValidator, {
      studentName: "",
      concern: "",
      description: "",
    });
    expect(result.isEmpty()).toBe(false);
    const fields = result.array().map((e) => e.path);
    expect(fields).toContain("studentName");
    expect(fields).toContain("concern");
    expect(fields).toContain("description");
  });

  test("Test 2: description shorter than 20 characters is rejected", async () => {
    const result = await runValidators(createReferralValidator, {
      studentName: "Alice Tan",
      concern: "Academic",
      description: "Too short",
    });
    expect(result.isEmpty()).toBe(false);
    const fields = result.array().map((e) => e.path);
    expect(fields).toContain("description");
  });

  test("Test 3: valid referral input passes validation", async () => {
    const result = await runValidators(createReferralValidator, {
      studentName: "Alice Tan",
      concern: "Academic",
      description: "Student is struggling with attendance and coursework over the past month.",
    });
    expect(result.isEmpty()).toBe(true);
  });
});

// ── Tests 6–7: Risk level validation ─────────────────────────────────────────

describe("Risk Level Validation", () => {
  test("Test 6: missing risk level is rejected", async () => {
    const result = await runValidators(triageReferralValidator, {
      riskLevel: "",
      triageNotes: "Some notes here",
    });
    expect(result.isEmpty()).toBe(false);
    const fields = result.array().map((e) => e.path);
    expect(fields).toContain("riskLevel");
  });

  test("Test 7: only LOW, MEDIUM, HIGH are accepted as valid risk levels", async () => {
    const invalid = await runValidators(triageReferralValidator, {
      riskLevel: "CRITICAL",
    });
    expect(invalid.isEmpty()).toBe(false);

    for (const level of ["LOW", "MEDIUM", "HIGH"]) {
      const valid = await runValidators(triageReferralValidator, {
        riskLevel: level,
      });
      const riskErrors = valid.array().filter((e) => e.path === "riskLevel");
      expect(riskErrors.length).toBe(0);
    }
  });
});

// ── Test 8: High-risk note validation ────────────────────────────────────────

describe("High-Risk Note Validation", () => {
  function requiresJustificationNote(riskLevel, triageNotes) {
    return riskLevel === "HIGH" && (!triageNotes || triageNotes.trim().length === 0);
  }

  test("Test 8: HIGH risk without a note requires justification", () => {
    expect(requiresJustificationNote("HIGH", "")).toBe(true);
    expect(requiresJustificationNote("HIGH", "   ")).toBe(true);
    expect(requiresJustificationNote("HIGH", "Student poses immediate risk.")).toBe(false);
    expect(requiresJustificationNote("MEDIUM", "")).toBe(false);
    expect(requiresJustificationNote("LOW", "")).toBe(false);
  });
});
