import { test, expect, type APIRequestContext } from "@playwright/test";

const API = "https://casehub-api.onrender.com";

async function demoLogin(request: APIRequestContext, role: "TEACHER" | "COUNSELLOR") {
  const res = await request.post(`${API}/api/auth/demo-login`, {
    data: { role },
  });
  expect(res.ok(), `Demo login failed for ${role}: ${await res.text()}`).toBeTruthy();
  return res.json() as Promise<{ accessToken: string; user: { id: string; name: string; email: string; role: string } }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// E2E-02: Referral Triage Workflow
// ─────────────────────────────────────────────────────────────────────────────

test("E2E-02: counsellor triages a referral — risk level and outcome are saved", async ({
  page,
  request,
}) => {
  // ── Step 1: Create a referral as Teacher via API ──────────────────────────
  const teacher = await demoLogin(request, "TEACHER");

  const referralRes = await request.post(`${API}/api/referrals`, {
    headers: { Authorization: `Bearer ${teacher.accessToken}` },
    data: {
      studentName: "E2E Test Student",
      concern: "Academic",
      description: "This referral was created by an automated E2E test for triage workflow verification.",
    },
  });
  expect(referralRes.ok(), `Referral creation failed: ${await referralRes.text()}`).toBeTruthy();
  const { referral } = await referralRes.json();
  const referralId = referral.id;

  // ── Step 2: Inject counsellor session before React boots ──────────────────
  const counsellor = await demoLogin(request, "COUNSELLOR");

  await page.addInitScript(
    ({ token, userData }: { token: string; userData: object }) => {
      sessionStorage.setItem("casehub_token", token);
      sessionStorage.setItem("casehub_user", JSON.stringify(userData));
    },
    { token: counsellor.accessToken, userData: counsellor.user }
  );

  // ── Step 3: Navigate directly to the referral detail page ────────────────
  await page.goto(`/counsellor/referrals/${referralId}`);
  await page.waitForLoadState("networkidle");

  await expect(page.getByText("E2E Test Student")).toBeVisible({ timeout: 15000 });

  // ── Step 4: Fill in the triage form ──────────────────────────────────────
  await page.getByRole("button", { name: /medium/i }).click();
  await page.getByRole("combobox").selectOption("OPEN_CASE");
  await page.getByPlaceholder(/document your assessment/i).fill(
    "Student is showing signs of academic stress. Recommend opening a case for follow-up sessions."
  );

  // ── Step 5: Submit triage ─────────────────────────────────────────────────
  await page.getByRole("button", { name: /complete triage/i }).click();

  // ── Step 6: Verify triage success message appears ────────────────────────
  await expect(page.getByText(/triage complete/i)).toBeVisible({ timeout: 10000 });

  // ── Step 7: Verify via API that risk level and status were persisted ──────
  const verifyRes = await request.get(`${API}/api/referrals/${referralId}`, {
    headers: { Authorization: `Bearer ${counsellor.accessToken}` },
  });
  expect(verifyRes.ok()).toBeTruthy();
  const { referral: updated } = await verifyRes.json();

  expect(updated.riskLevel).toBe("MEDIUM");
  expect(updated.status).toBe("IN_REVIEW");
});
