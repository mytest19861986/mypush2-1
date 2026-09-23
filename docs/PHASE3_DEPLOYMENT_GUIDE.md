# HAMI CARD PHASE 3 DEPLOYMENT & CUTOVER GUIDE
## Operational Runbook, Environment Security, Migration Policy & Rollback

**Release Document:** Phase 3 Final Cutover Gate  
**Reference Baseline:** `v2.4-client-demo-ready` (Commit `f65fe1e`)  
**Phase 3 Development Branch:** `phase3-real-data-integration`  
**Security Status:** RBAC ENFORCED & E2E VERIFIED ✅  

---

## 1. System Architecture Overview

In Phase 3, Hami Card operates on a decoupled 4-tier enterprise structure:
```text
┌────────────────────────────────────────────────────────┐
│             Tier 1: Premium Experience UI              │
│       (7 Polished Showcase Pages with 0px Scroll)      │
└───────────────────────────▲────────────────────────────┘
                            │ Strongly Typed Contracts
┌───────────────────────────┴────────────────────────────┐
│         Tier 2: Universal Data Adapter Layer           │
│   (Dashboard, Users, Healthcare, Agents, Reports BI)   │
└───────────────────────────▲────────────────────────────┘
                            │ JWT + RBAC Protected BFF
┌───────────────────────────┴────────────────────────────┐
│          Tier 3: Secure API Access Routes              │
│    (/api/v1/dashboard, /users, /healthcare, /agents)   │
└───────────────────────────▲────────────────────────────┘
                            │ Parameterized ORM
┌───────────────────────────┴────────────────────────────┐
│            Tier 4: Enterprise Domain Database          │
│       (Prisma Client with Relational Integrity)        │
└────────────────────────────────────────────────────────┘
```

---

## 2. Environment Variables & Production Secrets

Ensure the following variables are securely populated in `.env.production` (never committed to repository):

| Variable Name | Required Format / Specification | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | `file:./prisma/dev.db` (or PostgreSQL URI) | Connection string for Prisma Client |
| `JWT_SECRET` | 32+ character high-entropy cryptographic string | Signs & verifies user session tokens |
| `TOKEN_PEPPER` | 32+ character random string | Hash pepper for refresh tokens |
| `NEXT_PUBLIC_APP_ENV` | `production` (or `staging`) | Controls demo fallback availability |
| `PORT` | `3000` | HTTP service port |

> [!CAUTION]
> In production environments (`NODE_ENV === 'production'`), the `demo=true` query parameter fallback is automatically restricted to QA and audit testing roles.

---

## 3. Database Migration & Integrity Policy

1. **Zero Big-Bang Schema Migrations**: All existing tables (`User`, `Doctor`, `Agent`, `Contract`, `Transaction`, `Commission`, `Settlement`) must retain backward compatibility.
2. **Schema Validation Before Cutover**:
   ```bash
   npx prisma validate
   npx prisma generate
   ```
3. **Seed & Relational Verification**: Run the automated test suite before initiating production traffic:
   ```bash
   npx tsx src/services/adapters/phase3-e2e-validation.ts
   ```

---

## 4. Rollback Strategy & Failsafe Measures

If any live data discrepancy, authorization breach, or performance degradation occurs during real data cutover:

### Failsafe Step 1: Immediate Adapter Fallback (Zero Downtime)
Every adapter supports immediate fallback by setting the default adapter mode to mock baseline:
```typescript
// Instant rollback without redeploying frontend assets:
export async function getDashboardAdapter() {
  return getDashboardDemoData(); // Reverts immediately to sealed v2.4 baseline
}
```

### Failsafe Step 2: Git Rollback to Sealed Baseline
If code-level revert is required, switch back to the permanently sealed demo baseline tag:
```bash
git checkout v2.4-client-demo-ready
npm run build
```

---

## 5. Security & RBAC Boundary Checklist

- [x] Unauthenticated requests return `401 Unauthorized`.
- [x] Unauthorized role access returns `403 Forbidden`.
- [x] Financial and BI endpoints restricted exclusively to `SUPER_ADMIN` and `ADMIN`.
- [x] Multi-tenant isolation verified: `AGENT` role access is scoped to their own referral records.
- [x] All user inputs (national code, mobile, page size) are sanitized and clamped.
- [x] Zero plain-text secrets in repository.

---

## 6. Official Phase 3 Cutover Verification Checklist

1. [x] **Adapter Health Checks**: 100% Passed (`adapter-health-check.ts`).
2. [x] **RBAC Security Audit**: 100% Passed (`rbac-security-audit.ts`).
3. [x] **Healthcare & Sales Intelligence Audit**: 100% Passed (`healthcare-sales-audit.ts`).
4. [x] **End-to-End System Validation**: 100% Passed across all 8 gates (`phase3-e2e-validation.ts`).
5. [x] **Demo Branch Isolation**: `demo-phase-1` (`c0ac8f6`) & `v2.4-client-demo-ready` (`f65fe1e`) strictly locked 🔒.
