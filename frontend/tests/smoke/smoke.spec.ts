import { test, expect } from "@playwright/test";

// SM-01: Backend health check
test("SM-01: backend health check returns success", async ({ request }) => {
  const res = await request.get("https://casehub-api.onrender.com/api/health");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.ok).toBe(true);
});

// SM-02: Frontend application loads
test("SM-02: frontend application loads without crashing", async ({ page }) => {
  await page.goto("/");
  await expect(page).not.toHaveTitle(/error/i);
  await expect(page.locator("body")).toBeVisible();
});

// SM-03: Login page loads
test("SM-03: login page is displayed", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
  // Login page should show CaseHub branding
  await expect(page.getByText("CaseHub")).toBeVisible();
});

// SM-04: Teacher referral page loads without crashing
test("SM-04: teacher referral submission page loads without error", async ({ page }) => {
  await page.goto("/teacher/submit");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
});

// SM-05: Counsellor queue page loads without crashing
test("SM-05: counsellor referral queue page loads without error", async ({ page }) => {
  await page.goto("/counsellor/queue");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
});

// SM-06: Lead admin dashboard loads without crashing
test("SM-06: lead admin dashboard page loads without error", async ({ page }) => {
  await page.goto("/lead");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
});

// SM-07: API responds to a basic request without crashing
test("SM-07: API returns expected response instead of crashing", async ({ request }) => {
  const res = await request.get("https://casehub-api.onrender.com/api/referrals/me");
  // 401 = auth guard working, not a crash
  expect([200, 401]).toContain(res.status());
});

// SM-08: Application has no startup errors (no error page shown)
test("SM-08: application shows no runtime error on load", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  expect(errors).toHaveLength(0);
});
