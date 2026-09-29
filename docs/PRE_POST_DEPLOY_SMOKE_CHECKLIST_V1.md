# Pre & Post-Deployment Smoke Checklist (V1)

**Application:** Hami Card V2 (حامی‌کارت)  
**Standard Viewports:** Mobile 390x844px, Desktop 1440x900px  

---

## 1. Pre-Deployment Smoke Checklist

- [x] TypeScript validation (`npx tsc --noEmit` -> 0 errors)
- [x] Next.js production build (`npm run build` -> 120/120 routes PASS)
- [x] Error boundaries active (`src/app/error.tsx` & `src/app/not-found.tsx`)
- [x] Database migrations verified (`npx prisma migrate status` -> Up to date)
- [x] Secrets hygiene audit (0 plaintext credentials or hardcoded tokens in source)
- [x] Zero hydration errors in production mode
- [x] Zero horizontal overflow on mobile viewports (390px)

---

## 2. Post-Deployment Smoke Checklist (Live Environment)

- [ ] **HTTPS & SSL:** Valid TLS certificate with redirect from HTTP to HTTPS.
- [ ] **Homepage:** Loads under 1.5s with all static assets and fonts.
- [ ] **Authentication Flow:**
  - [ ] Mobile OTP login succeeds with test user.
  - [ ] Tokens stored in Secure/HttpOnly cookies.
  - [ ] Expired token refresh succeeds without kicking user out.
- [ ] **Dashboard States:**
  - [ ] NEW_MEMBER shows plan selection CTA.
  - [ ] COVERAGE_ACTIVE shows doctor search CTA.
  - [ ] POST_VISIT_FOLLOWUP shows review submission CTA.
- [ ] **Healthcare Directory:** Search doctors by specialty and city.
- [ ] **API Endpoints:**
  - [ ] `GET /api` responds with 200 OK.
  - [ ] Protected endpoints reject unauthenticated requests with 401.
- [ ] **Logout Flow:** Clears session and redirects to login/home cleanly.
- [ ] **Monitoring & Logs:** 0 unhandled exceptions or 5xx error spikes in error logs.
