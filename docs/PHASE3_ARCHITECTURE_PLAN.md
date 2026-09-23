# HAMI CARD PHASE 3 ARCHITECTURE PLAN
## Real Data Binding, Adapter Layer, RBAC & Integration Strategy

**Document Version:** 1.0.0  
**Target Branch:** `phase3-real-data-integration`  
**Baseline Origin:** `v2.4-client-demo-ready` (`f65fe1e`)  
**Status:** DRAFTED FOR COMMANDER APPROVAL ✅  

---

## 1. Executive Summary & Core Principle

Phase 3 transitions the Hami Card platform from the sealed **Presentation Showcase (v2.4)** to a fully live, reactive, and authenticated enterprise system.

### Golden Rule: "Adapter Layer Integration — Zero UI Destruction"
```text
┌────────────────────────────────────────────────────────┐
│            Premium UI Components (Client)              │
│       (DashboardAppShell, PremiumMetricCard, etc.)      │
└───────────────────────────▲────────────────────────────┘
                            │ Strongly Typed Props
┌───────────────────────────┴────────────────────────────┐
│           Adapter & Transformation Layer (TS)          │
│       (Transforms DB Entities into View-Ready Props)   │
└───────────────────────────▲────────────────────────────┘
                            │ Fetch / Server Action / TanStack
┌───────────────────────────┴────────────────────────────┐
│           Next.js API Routes & Services (BFF)          │
│       (Role Guard, Auditing, Multi-Tenant Filter)      │
└───────────────────────────▲────────────────────────────┘
                            │ Prisma ORM
┌───────────────────────────┴────────────────────────────┐
│              SQLite / PostgreSQL Database               │
└────────────────────────────────────────────────────────┘
```
**No Big-Bang Rewrites:** The existing Premium preview pages remain operational and intact as reference points. Real data integration proceeds via designated production routes or feature-flagged adapters.

---

## 2. Real Data Mapping Matrix

| Premium UI Screen | Target Metric / Section | Source Prisma Model / Table | Live Fields / Aggregations | Current Status |
| :--- | :--- | :--- | :--- | :--- |
| **Executive Dashboard** | Total Active Cards | `UserPlan` | `count({ where: { status: 'ACTIVE' } })` | Adapter Ready |
| | Monthly Growth / Revenue | `Transaction` / `Payment` | `sum(amount) where type='SUBSCRIPTION'` | Adapter Ready |
| | Network Visits | `Visit` | `count() group by month` | Adapter Ready |
| | Active Healthcare Centers | `Doctor` / `Clinic` | `count({ where: { status: 'APPROVED' } })` | Adapter Ready |
| | Recent Transaction Table | `Transaction` | `findMany({ take: 10, include: { user, plan } })` | Adapter Ready |
| **Users Module** | User List & Card Status | `User`, `UserProfile`, `UserPlan` | `mobile`, `nationalCode`, `fullName`, `status` | Adapter Ready |
| | Kyc & Documents | `Upload`, `UserProfile` | `isMobileVerified`, national card scans | Adapter Ready |
| **Doctors & Clinics** | Medical Providers Directory | `Doctor`, `Clinic`, `MedicalCenter` | `name`, `specialty`, `city`, `discountRate`, `contract` | Adapter Ready |
| | Settlement Status | `Settlement`, `Wallet` | `balance`, `pendingAmount`, `sheba` | Adapter Ready |
| **Agents Module** | Sales Agent Tree | `Agent`, `User`, `Commission` | `code`, `tier`, `totalSales`, `directReferrals` | Adapter Ready |
| | Commission Payouts | `Commission` | `amount`, `status='PAID' / 'PENDING'` | Adapter Ready |
| **Reports & BI** | Revenue & Settlement Charts | `Transaction`, `Settlement` | Aggregated monthly/weekly cashflow | Adapter Ready |
| | Top Performing Centers | `Doctor`, `Visit` | Aggregated visits & satisfaction ratings | Adapter Ready |
| **Settings & Profile** | Admin Profile & Security | `UserProfile`, `UserRole`, `LoginLog` | Password hash, 2FA, session tokens, audit log | Adapter Ready |

---

## 3. Mock → Real Transition Strategy (The Adapter Pattern)

To avoid regressions or breaking UI contracts, every module implements a typed adapter interface:

```typescript
// Example: src/services/adapters/dashboard-adapter.ts
export interface DashboardViewProps {
  metrics: {
    totalRevenue: number;
    activeCards: number;
    healthcareVisits: number;
    activeCenters: number;
  };
  recentActivities: Array<{
    id: string;
    title: string;
    date: string;
    amount: number;
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
  }>;
}

export async function getDashboardData(isDemo = false): Promise<DashboardViewProps> {
  if (isDemo) {
    return getDashboardDemoData(); // Sealed Phase 2 baseline data
  }
  return fetchDashboardFromPrisma(); // Live DB aggregation
}
```

---

## 4. Security & RBAC Enforcement Review

### Permission Boundary Matrix:
1. **SUPER_ADMIN**: Unrestricted access to all modules, financial reconciliations, settings, audit logs, and user impersonation.
2. **ADMIN**: Full operational access across Users, Doctors, and Agents. Read-only on system settings and encrypted payout keys.
3. **SUPPORT / OPERATOR**: Read & Verify access on KYC, tickets, user search, and visit confirmations. Zero access to financial settlements.
4. **AGENT**: Scoped strictly to direct referral downlines, commission ledger, and marketing collateral. Multi-tenant isolation enforced at DB query level (`agentId = session.user.agentId`).
5. **DOCTOR / CLINIC**: Scoped to reception check-ins, patient visit validation, and settlement requests. Zero visibility into other medical clinics.

### Security Defenses:
- **Session Tokens**: JWT with rotational refresh token validation in `RefreshToken` table.
- **Auditing**: Every create/update/delete writes to `AuditLog` table with `userId`, `ipAddress`, `action`, `resource`, and timestamp.
- **SQL Injection & XSS**: 100% parameterized Prisma ORM queries + sanitized Zod input validation schemas.

---

## 5. Risk Assessment & Mitigation

| Identified Risk | Severity | Mitigation Strategy |
| :--- | :---: | :--- |
| **Data Schema Discrepancy** | High | Prisma schema validation script against preview components before deployment. |
| **Performance Lag on Aggregations** | Medium | Implement Redis / memory caching for BI metrics with 5-minute TTL. |
| **Unauthorized Data Leakage** | Critical | Server-side role assertions on all `/api/v1/*` endpoints; do not rely on UI hiding. |
| **Accidental Demo Branch Tampering** | Critical | `demo-phase-1` and `v2.4-client-demo-ready` remain tagged, locked, and unmerged. |

---

## 6. Phase 3 Recommended Execution Sequence

1. **Step 1 (Mission 542)**: Build typed Data Access Adapters (`src/services/adapters/*`) for Executive Dashboard & Users.
2. **Step 2 (Mission 543)**: Implement Next.js Server Actions / API routes with strict RBAC guards (`src/app/api/v1/dashboard/*`).
3. **Step 3 (Mission 544)**: Connect Doctor & Agent networks with real settlement & commission calculation pipelines.
4. **Step 4 (Mission 545)**: End-to-end integration testing, database seed validation, and performance benchmark.
