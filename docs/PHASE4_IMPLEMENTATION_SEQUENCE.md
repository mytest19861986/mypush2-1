# Phase 4 Implementation Sequence & QA Gates

**Reference**: Mission 556 Technical Plan  
**Target Baseline**: `v2.4.6-client-premium-demo-approved`

---

## Stage Breakdown

### Stage 1: FB-102 Advanced Plan Filters
- **Branch**: `feat/phase4-fb102-plan-filters`
- **Scope**: Frontend UI inputs + query parameter wiring.
- **QA Gate 1**:
  - Filter by price, discount, and status.
  - Zero hydration mismatch.
  - Performance response < 100ms.

### Stage 2: FB-103 Excel/CSV Export Engine
- **Branch**: `feat/phase4-fb103-data-export`
- **Scope**: Utility `src/lib/export.ts` + Export buttons in Users and Doctors tables.
- **QA Gate 2**:
  - Persian characters open properly in Windows Excel.
  - Filtered export accuracy.
  - Non-admin access rejected (`403 FORBIDDEN`).

### Stage 3: FB-101 Direct User Registration
- **Branch**: `feat/phase4-fb101-user-registration`
- **Scope**: Registration form UI + `/api/v1/auth/register` + Auto-login tokens.
- **QA Gate 3**:
  - Full registration to dashboard flow.
  - Duplicate mobile rejected (`409`).
  - Strict password validation.
