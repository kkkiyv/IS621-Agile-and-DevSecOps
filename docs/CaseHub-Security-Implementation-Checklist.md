# CaseHub Security Implementation Checklist

**Project:** CaseHub — Student Referral and Case Management System  
**Course:** IS621 Agile and DevSecOps  
**Document version:** 1.0  
**Date:** May 2026  

---

## 1. Purpose of this document

This checklist consolidates security work for CaseHub based on the team architecture diagram (Presentation → Security Middleware → Data → CI/CD) and discussions on:

- Implementing a proper **login system**
- **Security controls** required at each layer
- **MFA as part of SSO** (not built inside the referral API)

Use it as your master task list. Items marked **DONE** are already in the current unified codebase (`abcb240` and later). Items marked **TODO** still need to be completed.

---

## 2. Architecture summary (what you are securing)

| Layer | Technology | Security responsibility |
|-------|------------|-------------------------|
| Presentation | React 18 + TypeScript | Login UI, token storage, route guards, API client |
| Trust boundary | HTTPS | Encrypt traffic between browser and API |
| Business logic | Node.js + Express | JWT validation, RBAC, input validation, rate limiting, audit |
| Data | PostgreSQL + Prisma | Users, referrals (PII), audit log |
| Delivery | Docker + GitHub Actions | Lint, test, secret scan, dependency audit |

**Core principle (from architecture):** Confidentiality, Integrity, Availability — **least-privilege RBAC** and **secure transport (HTTPS)**.

---

## 3. What is already implemented (DONE)

| # | Item | Location / notes |
|---|------|------------------|
| 1 | Demo JWT login (role cards) | `POST /api/auth/demo-login`, `LoginPage.tsx` |
| 2 | Email/password login API | `POST /api/auth/login`, bcrypt in `auth.routes.js` |
| 3 | JWT sign and verify (8h expiry) | `backend/src/utils/jwt.js` |
| 4 | Authenticate middleware (Bearer token) | `backend/src/middleware/authenticate.js` |
| 5 | Re-load user from DB on each request | Prevents use of token after user deleted |
| 6 | Role-based access control (RBAC) | `requireRole.js` on all protected routes |
| 7 | Teacher data sanitization (no triage fields) | `toTeacherReferral()` in serializers |
| 8 | Referral input validation | express-validator on create/triage |
| 9 | CORS allowlist | `FRONTEND_URL` in `backend/src/index.js` |
| 10 | Secrets in `.env` (gitignored) | `.env.example` has placeholders only |
| 11 | Generic login error message | Avoids user enumeration on `/login` |
| 12 | Prisma (parameterized queries) | Reduces SQL injection risk |
| 13 | HANDOFF security section | `docs/HANDOFF.md` §10 |

---

## 4. Master checklist — what you still need to do

### Phase A — Login system (course MVP, do first)

| # | Task | Priority | Details |
|---|------|----------|---------|
| A1 | Add email/password login UI | High | Wire `LoginPage` to `POST /api/auth/login`; show errors; redirect by role |
| A2 | Keep demo mode optional | Medium | Toggle or separate “Demo mode” section; hide in production |
| A3 | Rate limit auth endpoints | High | Use `express-rate-limit` on `/api/auth/login` and `/api/auth/demo-login` (e.g. 5 req / 15 min per IP) |
| A4 | Validate login input | High | Email format, password required; use express-validator |
| A5 | Enforce password policy | Medium | Min length (e.g. 8), document in README; apply on register if you add registration |
| A6 | Frontend 401 handling | Medium | Redirect to login when token expired or invalid |
| A7 | Logout clears session | Low | Confirm `sessionStorage` cleared (already in `AuthContext`) |
| A8 | Document seeded accounts | Low | teacher@casehub.demo / counsellor@casehub.demo / lead@casehub.demo — password `demo123!` |

### Phase B — Application security (before demo / DevSecOps review)

| # | Task | Priority | Details |
|---|------|----------|---------|
| B1 | Add Helmet security headers | High | `helmet` middleware on Express (XSS, clickjacking, etc.) |
| B2 | Disable demo-login in production | High | `if (process.env.NODE_ENV === 'production')` return 404 for demo-login |
| B3 | Strong JWT_SECRET in production | High | 32+ random bytes; never commit; rotate if leaked |
| B4 | Shorten JWT expiry for prod | Medium | Consider 1–2h instead of 8h for coursework demo |
| B5 | Audit log table and writes | High | Prisma `AuditLog`: userId, action, resourceId, timestamp; log login, failed login, triage |
| B6 | Lead audit UI (optional) | Medium | Placeholder page → list audit events for LEAD_ADMIN |
| B7 | No PII in server logs | High | Do not log passwords, tokens, full referral descriptions |
| B8 | IDOR review on all routes | High | Teachers: `submittedById = req.user.id`; counsellors: allowed paths only |
| B9 | HTTPS in deployment | High | TLS at reverse proxy; document in HANDOFF |
| B10 | Threat model (STRIDE) | Medium | 1–2 page doc: spoofing, tampering, repudiation, info disclosure, DoS, elevation on referral PII |

### Phase C — SSO and MFA (production / final architecture)

| # | Task | Priority | Details |
|---|------|----------|---------|
| C1 | Choose IdP | High | Clerk **or** institutional SSO (Azure AD / Okta) — align with teammate |
| C2 | Enable MFA at IdP | High | TOTP or passkeys; required for Counsellor and Lead/Admin |
| C3 | Do not build custom MFA in Node | — | IdP handles MFA; CaseHub only validates IdP tokens |
| C4 | SSO login flow | High | Authorization code flow; hosted sign-in UI from IdP |
| C5 | Map IdP user → CaseHub User | High | Store `externalId` or email; assign `role` in DB (never from client) |
| C6 | Backend verify IdP JWT | High | Validate `iss`, `aud`, signature, expiry; use IdP JWKS |
| C7 | Replace sessionStorage for prod | High | httpOnly, Secure, SameSite cookies or short-lived access + refresh |
| C8 | Remove password auth for SSO users | Medium | Optional `passwordHash` only for local dev |
| C9 | Role-based MFA policy doc | Medium | Teachers: org policy; Counsellor/Lead: MFA required — document in HANDOFF |
| C10 | CORS and redirect URIs | High | Register exact callback URLs in IdP dashboard |

### Phase D — DevSecOps pipeline (GitHub Actions)

| # | Task | Priority | Details |
|---|------|----------|---------|
| D1 | CI workflow | High | `npm ci`, lint, test on push/PR |
| D2 | Prisma validate in CI | Medium | `npx prisma validate` |
| D3 | Secret scanning | High | gitleaks or GitHub secret scanning |
| D4 | Dependency audit | High | `npm audit` (fail on high/critical or document exceptions) |
| D5 | Auth/RBAC integration tests | High | Teacher cannot PATCH triage; cannot see others’ referrals |
| D6 | `.env` never in Docker image | High | Use env vars at runtime |
| D7 | Document production deploy | Medium | Docker compose or host; TLS, env secrets |

---

## 5. Security concerns mapped to actions

### 5.1 Authentication (who are you?)

| Concern | Action |
|---------|--------|
| Weak passwords | Password policy; bcrypt (done) |
| Brute force | Rate limiting (A3) |
| Demo login in prod | Disable (B2) |
| JWT theft (XSS) | Document risk; prod → httpOnly cookies (C7) |
| Token forgery | Strong JWT_SECRET; verify every request (done) |
| Stale user in token | Reload user from DB (done) |

### 5.2 Authorization (what can you do?)

| Concern | Action |
|---------|--------|
| Teacher sees triage data | Keep serializers + RBAC (done); test (D5) |
| IDOR on referral IDs | Scope all queries by user/role (B8) |
| Role escalation via login body | Real login: role from DB only (A1, C5) |
| Lead performing triage | PATCH triage counsellor-only (done) |

### 5.3 Transport and headers

| Concern | Action |
|---------|--------|
| HTTP sniffing | HTTPS in prod (B9) |
| CORS abuse | Allowlist only (done) |
| Missing headers | Helmet (B1) |

### 5.4 Data and confidentiality (referral PII)

| Concern | Action |
|---------|--------|
| PII in logs | Policy + code review (B7) |
| User enumeration | Generic errors (done) |
| No accountability | Audit log (B5, B6) |

### 5.5 MFA and SSO (summary)

| Question | Answer |
|----------|--------|
| Should MFA be in CaseHub API? | **No** — enable at IdP |
| Should MFA be in SSO? | **Yes** — required for Counsellor and Lead |
| What does CaseHub implement? | Token validation + RBAC + audit |
| What does IdP implement? | Login, MFA, password reset, lockout |

---

## 6. Suggested order of work (sprint-friendly)

**Sprint 1 — Login hardening**  
A1 → A3 → A4 → A6 → A8

**Sprint 2 — App security**  
B1 → B2 → B5 → B8 → B7 → B10

**Sprint 3 — DevSecOps**  
D1 → D3 → D4 → D5

**Sprint 4 — SSO + MFA (if required by course)**  
C1 → C2 → C4 → C5 → C6 → C7 → C9 → C10

---

## 7. Team coordination

| Topic | Decision needed |
|-------|-----------------|
| Auth approach | Demo JWT only vs email/password vs Clerk/SSO |
| Schema | One Prisma schema (concern, LEAD_ADMIN) — no duplicate routes |
| MFA | IdP policy; not duplicate in Express |
| Production | Who owns deploy, TLS, and secrets |

**Rule:** One auth stack on `main`. Do not merge Clerk routes and demo JWT routes without removing duplicates.

---

## 8. Verification checklist (sign-off)

Before submission or demo, confirm:

- [ ] Login works with email/password (not only demo cards)
- [ ] Rate limiting returns 429 after repeated failed logins
- [ ] Teacher API responses contain no `riskLevel` or `triageNotes`
- [ ] Counsellor can triage; teacher cannot PATCH triage
- [ ] `JWT_SECRET` is set and not in Git
- [ ] `npm audit` run; critical issues addressed or documented
- [ ] HANDOFF.md updated with auth and MFA/SSO approach
- [ ] MFA documented as IdP responsibility (Phase C)
- [ ] HTTPS documented for production

---

## 9. References in repository

| File | Purpose |
|------|---------|
| `docs/HANDOFF.md` | Runbook, API, security §10 |
| `backend/src/routes/auth.routes.js` | Login endpoints |
| `backend/src/middleware/authenticate.js` | JWT validation |
| `backend/src/middleware/requireRole.js` | RBAC |
| `frontend/src/context/AuthContext.tsx` | Token storage |
| `frontend/src/pages/LoginPage.tsx` | Login UI |

---

## 10. Document approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| DevSecOps | | | |
| Lead | | | |

---

*End of checklist*
