# Sprint 1 Auth - Refactoring Implementation Guide

**Status**: Ready to Implement  
**Risk Level**: LOW ✅  
**Estimated Time**: 4-6 hours  

---

## QUICK START CHECKLIST

### Before You Start
- [ ] Read `MIGRATION_ANALYSIS.md` (overview)
- [ ] Verify `npm install` completed
- [ ] Run `prisma generate`
- [ ] Run `npm run lint` (should be 0 errors)
- [ ] Run `npm run build` (should succeed)

---

## IMPLEMENTATION PHASE 1: VALIDATORS CENTRALIZATION (30 min)

### File to Create: `src/lib/validators.ts`

```typescript
import { z } from 'zod'

// ─── Custom Validators ───────────────────────────────────────────────────

export const iranianMobileRegex = /^09\d{9}$/

/**
 * Validates Iranian mobile number format (starts with 09, 11 digits total)
 */
export function validateIranianMobile(mobile: string): boolean {
  return iranianMobileRegex.test(mobile)
}

// ─── Zod Schemas ────────────────────────────────────────────────────────

export const mobileSchema = z
  .string()
  .regex(iranianMobileRegex, 'شماره موبایل باید به صورت ۰۹xxxxxxxxx باشد')

export const passwordSchema = z
  .string()
  .min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد')
  .max(128, 'رمز عبور نمی‌تواند بیش از ۱۲۸ کاراکتر باشد')

export const otpSchema = z
  .string()
  .regex(/^\d{5}$/, 'کد یکبار مصرف باید ۵ رقم باشد')

export const emailSchema = z
  .string()
  .email('ایمیل معتبر نیست')
  .optional()

export const medicalCodeSchema = z
  .string()
  .min(1, 'کد نظام پزشکی الزامی است')
  .max(50, 'کد نظام پزشکی خیلی طولانی است')

export const businessNameSchema = z
  .string()
  .min(3, 'نام کسب‌وکار باید حداقل ۳ کاراکتر باشد')
  .max(100, 'نام کسب‌وکار نمی‌تواند بیش از ۱۰۰ کاراکتر باشد')

// ─── Composite Schemas ──────────────────────────────────────────────────

export const sendOtpSchema = z.object({
  mobile: mobileSchema,
})

export const verifyOtpSchema = z.object({
  mobile: mobileSchema,
  code: otpSchema,
})

export const loginSchema = z.object({
  mobile: mobileSchema,
  password: passwordSchema,
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
})

export const doctorRegisterSchema = z.object({
  medicalCode: medicalCodeSchema,
  specialty: z.string().min(1, 'تخصص الزامی است'),
  clinicName: z.string().min(1, 'نام مطب الزامی است'),
  clinicAddress: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
})

export const agentRegisterSchema = z.object({
  businessName: businessNameSchema,
  description: z.string().max(500, 'توضیحات خیلی طولانی است').optional(),
})

// ─── Type Exports ───────────────────────────────────────────────────────

export type SendOtpInput = z.infer<typeof sendOtpSchema>
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
export type DoctorRegisterInput = z.infer<typeof doctorRegisterSchema>
export type AgentRegisterInput = z.infer<typeof agentRegisterSchema>
```

### Usage in Routes

Replace existing validation code with:

```typescript
// BEFORE (in route)
const loginSchema = z.object({
  mobile: z.string().regex(/^09\d{9}$/, 'فرمت شماره موبایل نامعتبر است'),
  password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد'),
})

// AFTER (in route)
import { loginSchema } from '@/lib/validators'

const parsed = loginSchema.safeParse(body)
```

**Files to Update**:
- `src/app/api/v1/auth/send-otp/route.ts`
- `src/app/api/v1/auth/verify-otp/route.ts`
- `src/app/api/v1/auth/login/route.ts`
- `src/app/api/v1/auth/refresh/route.ts`
- `src/app/api/v1/doctor/register/route.ts`
- `src/app/api/v1/agents/register/route.ts`

---

## IMPLEMENTATION PHASE 2: ERROR CODE STANDARDIZATION (30 min)

### File to Create: `src/lib/error-codes.ts`

```typescript
/**
 * Standardized error codes for the entire application
 * Use these constants instead of magic strings
 */

export const ErrorCodes = {
  // Authentication Errors
  AUTH_UNAUTHORIZED: 'UNAUTHORIZED',
  AUTH_INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'INVALID_TOKEN',
  AUTH_TOKEN_REVOKED: 'TOKEN_REVOKED',
  AUTH_SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Validation Errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  VALIDATION_INVALID_INPUT: 'INVALID_INPUT',
  VALIDATION_MISSING_FIELD: 'MISSING_FIELD',

  // Rate Limiting Errors
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  RATE_LIMIT_TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  RATE_LIMIT_TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Permission/Authorization Errors
  AUTH_FORBIDDEN: 'FORBIDDEN',
  AUTH_PERMISSION_DENIED: 'PERMISSION_DENIED',
  AUTH_ROLE_REQUIRED: 'ROLE_REQUIRED',

  // Resource Errors
  RESOURCE_NOT_FOUND: 'NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'CONFLICT',

  // User Errors
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_BLOCKED: 'USER_BLOCKED',
  USER_INACTIVE: 'USER_INACTIVE',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',

  // OTP Errors
  OTP_INVALID: 'INVALID_OTP',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_EXHAUSTED: 'OTP_EXHAUSTED',
  OTP_CANNOT_RESEND: 'CANNOT_RESEND_OTP',

  // Server Errors
  SERVER_INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVER_SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  SERVER_NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',

  // Database Errors
  DB_ERROR: 'DATABASE_ERROR',
  DB_CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
} as const

/**
 * Maps error codes to HTTP status codes
 */
export const ErrorCodeToHttpStatus: Record<(typeof ErrorCodes)[keyof typeof ErrorCodes], number> = {
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  TOKEN_EXPIRED: 401,
  INVALID_TOKEN: 401,
  TOKEN_REVOKED: 401,
  SESSION_EXPIRED: 401,

  VALIDATION_ERROR: 422,
  INVALID_INPUT: 422,
  MISSING_FIELD: 422,

  RATE_LIMIT_EXCEEDED: 429,
  TOO_MANY_ATTEMPTS: 429,
  TOO_MANY_REQUESTS: 429,

  FORBIDDEN: 403,
  PERMISSION_DENIED: 403,
  ROLE_REQUIRED: 403,

  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  CONFLICT: 409,

  USER_NOT_FOUND: 404,
  USER_BLOCKED: 403,
  USER_INACTIVE: 403,
  USER_ALREADY_EXISTS: 409,

  INVALID_OTP: 422,
  OTP_EXPIRED: 422,
  OTP_EXHAUSTED: 422,
  CANNOT_RESEND_OTP: 429,

  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  NOT_IMPLEMENTED: 501,

  DATABASE_ERROR: 500,
  CONSTRAINT_VIOLATION: 409,
}

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

/**
 * Get HTTP status for error code (with fallback)
 */
export function getHttpStatus(errorCode: ErrorCode | string): number {
  return ErrorCodeToHttpStatus[errorCode as ErrorCode] ?? 500
}
```

### Usage in Routes

```typescript
// BEFORE
return errorResponse('UNAUTHORIZED', 'Missing authorization header', 401)

// AFTER
import { ErrorCodes, getHttpStatus } from '@/lib/error-codes'

const status = getHttpStatus(ErrorCodes.AUTH_UNAUTHORIZED)
return errorResponse(ErrorCodes.AUTH_UNAUTHORIZED, 'Missing authorization header', status)

// Or even simpler - create helper
function unauthorized(message: string) {
  return errorResponse(ErrorCodes.AUTH_UNAUTHORIZED, message, 401)
}
```

---

## IMPLEMENTATION PHASE 3: LOGGER ABSTRACTION (20 min)

### File to Create: `src/lib/logger.ts`

```typescript
/**
 * Logger abstraction layer
 * Makes it easy to swap implementations later (e.g., Winston, Sentry)
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class Logger {
  private static isDevelopment = process.env.NODE_ENV === 'development'

  /**
   * Log debug message (only in development)
   */
  static debug(scope: string, message: string, data?: any) {
    if (this.isDevelopment) {
      console.debug(`[${scope}] ${message}`, data)
    }
  }

  /**
   * Log info message
   */
  static info(scope: string, message: string, data?: any) {
    console.log(`[${scope}] ${message}`, data)
  }

  /**
   * Log warning message
   */
  static warn(scope: string, message: string, data?: any) {
    console.warn(`⚠️ [${scope}] ${message}`, data)
  }

  /**
   * Log error message
   */
  static error(scope: string, message: string, error?: any) {
    console.error(`❌ [${scope}] ${message}`, error)
  }

  /**
   * Log with specific level
   */
  static log(level: LogLevel, scope: string, message: string, data?: any) {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${level}] [${scope}] ${message}`

    switch (level) {
      case LogLevel.DEBUG:
        this.debug(scope, message, data)
        break
      case LogLevel.INFO:
        this.info(scope, message, data)
        break
      case LogLevel.WARN:
        this.warn(scope, message, data)
        break
      case LogLevel.ERROR:
        this.error(scope, message, data)
        break
    }
  }
}

// ─── Convenience Exports ────────────────────────────────────────────────

export const log = Logger.log
export const debug = Logger.debug
export const info = Logger.info
export const warn = Logger.warn
export const error = Logger.error
```

### Usage in Routes

```typescript
// BEFORE
console.log('[send-otp]', 'OTP generated:', otp)
console.error('[send-otp]', 'Error:', error)

// AFTER
import { Logger } from '@/lib/logger'

Logger.debug('send-otp', 'OTP generated:', otp)
Logger.error('send-otp', 'Error:', error)

// Or using convenience exports
import { debug, error } from '@/lib/logger'

debug('send-otp', 'OTP generated:', otp)
error('send-otp', 'Error:', error)
```

---

## IMPLEMENTATION PHASE 4: DATABASE QUERY HELPERS (45 min)

### File to Create: `src/lib/db-helpers.ts`

```typescript
import type { Prisma } from '@prisma/client'

/**
 * Common Prisma include/select patterns used across routes
 * This reduces duplication and ensures consistency
 */

// ─── User Includes ──────────────────────────────────────────────────────

export const userWithProfile = {
  profile: {
    select: {
      firstName: true,
      lastName: true,
      nationalCode: true,
      avatar: true,
      birthDate: true,
      gender: true,
      address: true,
    },
  },
} as const

export const userWithAgent = {
  agent: {
    select: {
      id: true,
      businessName: true,
      status: true,
      score: true,
      description: true,
      verifiedAt: true,
    },
  },
} as const

export const userWithDoctor = {
  doctor: {
    select: {
      id: true,
      medicalCode: true,
      specialty: true,
      clinicName: true,
      clinicAddress: true,
      city: true,
      province: true,
      phone: true,
      bio: true,
      status: true,
      verifiedAt: true,
    },
  },
} as const

export const userWithRoles = {
  roles: {
    include: {
      role: {
        select: {
          id: true,
          name: true,
          title: true,
        },
      },
    },
  },
} as const

// Combined include for authentication endpoints
export const userAuthInclude = {
  ...userWithProfile,
  ...userWithAgent,
  ...userWithDoctor,
} as const

// ─── Doctor Includes ────────────────────────────────────────────────────

export const doctorWithUser = {
  user: {
    select: {
      id: true,
      mobile: true,
      email: true,
      status: true,
      isMobileVerified: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
    },
  },
} as const

// ─── Agent Includes ─────────────────────────────────────────────────────

export const agentWithDocuments = {
  documents: {
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      type: true,
      file: true,
      status: true,
      reviewedAt: true,
    },
  },
} as const

export const agentWithUser = {
  user: {
    select: {
      id: true,
      mobile: true,
      email: true,
      status: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
    },
  },
} as const

// ─── Plan Includes ──────────────────────────────────────────────────────

export const planWithUsage = {
  userPlans: {
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      status: true,
      endDate: true,
      remainingUses: true,
    },
  },
} as const

// ─── Contract Includes ──────────────────────────────────────────────────

export const contractWithRelations = {
  user: {
    select: {
      id: true,
      mobile: true,
      profile: { select: { firstName: true, lastName: true } },
    },
  },
  doctor: {
    select: {
      id: true,
      user: { select: { profile: { select: { firstName: true, lastName: true } } } },
    },
  },
  userPlan: {
    select: {
      id: true,
      plan: { select: { name: true, discountPercent: true } },
    },
  },
} as const

// ─── Helper Functions ───────────────────────────────────────────────────

/**
 * Count total items matching filter (for pagination)
 */
export async function countUsers(
  where?: Prisma.UserWhereInput
): Promise<number> {
  const { db } = await import('./db')
  return db.user.count({ where })
}

/**
 * Get paginated results with metadata
 */
export async function getPaginatedUsers(
  page: number = 1,
  limit: number = 10,
  where?: Prisma.UserWhereInput
) {
  const { db } = await import('./db')
  const skip = (page - 1) * limit
  const total = await countUsers(where)

  const items = await db.user.findMany({
    where,
    skip,
    take: limit,
    include: userAuthInclude,
    orderBy: { createdAt: 'desc' },
  })

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}
```

### Usage in Routes

```typescript
// BEFORE
const user = await db.user.findUnique({
  where: { id: userId },
  include: {
    profile: {
      select: {
        firstName: true,
        lastName: true,
        nationalCode: true,
        avatar: true,
      },
    },
    agent: {
      select: {
        id: true,
        businessName: true,
        status: true,
      },
    },
  },
})

// AFTER
import { userAuthInclude } from '@/lib/db-helpers'

const user = await db.user.findUnique({
  where: { id: userId },
  include: userAuthInclude,
})
```

---

## IMPLEMENTATION PHASE 5: RESPONSE HELPERS ENHANCEMENT (20 min)

### File to Enhance: `src/lib/api-response.ts`

Add these helper functions:

```typescript
// Add to existing api-response.ts

/**
 * Common response patterns
 */

export function notFoundResponse(resource: string, statusCode: number = 404) {
  return errorResponse('NOT_FOUND', `${resource} یافت نشد`, statusCode)
}

export function forbiddenResponse(reason?: string) {
  const message = reason ?? 'شما اجازه دسترسی به این منبع را ندارید'
  return errorResponse('FORBIDDEN', message, 403)
}

export function unauthorizedResponse(reason?: string) {
  const message = reason ?? 'احراز هویت الزامی است'
  return errorResponse('UNAUTHORIZED', message, 401)
}

export function validationErrorResponse(message: string) {
  return errorResponse('VALIDATION_ERROR', message, 422)
}

export function rateLimitedResponse(retryAfter: number) {
  return errorResponse(
    'RATE_LIMITED',
    `تعداد دفعات تلاش بیش از حد مجاز است. لطفاً ${retryAfter} ثانیه دیگر تلاش کنید`,
    429
  )
}

export function conflictResponse(message: string) {
  return errorResponse('CONFLICT', message, 409)
}

export function internalErrorResponse(message: string = 'خطای داخلی سرور') {
  return errorResponse('INTERNAL_ERROR', message, 500)
}
```

### Usage in Routes

```typescript
// BEFORE
if (!user) {
  return errorResponse('NOT_FOUND', 'کاربر یافت نشد', 404)
}

// AFTER
import { notFoundResponse } from '@/lib/api-response'

if (!user) {
  return notFoundResponse('کاربر')
}

// Even cleaner in many cases
if (!user) {
  return notFoundResponse('User')
}
```

---

## IMPLEMENTATION PHASE 6: UPDATE ROUTES (2-3 hours)

### Routes to Update (Priority Order)

#### 1. `src/app/api/v1/auth/send-otp/route.ts`

```typescript
import { sendOtpSchema } from '@/lib/validators'
import { ErrorCodes } from '@/lib/error-codes'
import { Logger } from '@/lib/logger'

// Replace the inline schema with:
const parsed = sendOtpSchema.safeParse(body)

if (!parsed.success) {
  const firstError = parsed.error.issues[0]
  return validationErrorResponse(firstError?.message ?? 'Input validation failed')
}

// Replace console.log with:
Logger.debug('send-otp', 'OTP generated:', otp)

// Replace generic error strings with:
return rateLimitedResponse(retryAfter)
```

#### 2. `src/app/api/v1/auth/verify-otp/route.ts`

Similar pattern - replace with validators, error codes, and helpers.

#### 3. `src/app/api/v1/auth/login/route.ts`

```typescript
import { loginSchema } from '@/lib/validators'
import { unauthorizedResponse } from '@/lib/api-response'

const parsed = loginSchema.safeParse(body)
if (!parsed.success) {
  return validationErrorResponse(parsed.error.issues[0]?.message)
}

if (!user) {
  return unauthorizedResponse()
}
```

#### 4. `src/app/api/v1/auth/refresh/route.ts`

```typescript
import { refreshTokenSchema } from '@/lib/validators'

const parsed = refreshTokenSchema.safeParse(body)
if (!parsed.success) {
  return validationErrorResponse(parsed.error.issues[0]?.message)
}
```

#### 5. `src/app/api/v1/doctor/register/route.ts`

```typescript
import { doctorRegisterSchema } from '@/lib/validators'

const parsed = doctorRegisterSchema.safeParse(body)
if (!parsed.success) {
  return validationErrorResponse(parsed.error.issues[0]?.message)
}
```

#### 6. `src/app/api/v1/agents/register/route.ts`

```typescript
import { agentRegisterSchema } from '@/lib/validators'

const parsed = agentRegisterSchema.safeParse(body)
if (!parsed.success) {
  return validationErrorResponse(parsed.error.issues[0]?.message)
}
```

---

## VERIFICATION CHECKLIST

### After Each Phase

- [ ] Run `npm run lint` → 0 errors
- [ ] Run `npm run build` → Success
- [ ] No console warnings during build
- [ ] TypeScript strict mode passes
- [ ] All imports resolve correctly

### After All Phases

- [ ] Run `npm run dev` → Server starts
- [ ] Test login flow:
  - [ ] `POST /api/v1/auth/send-otp` → 200 OK
  - [ ] `POST /api/v1/auth/verify-otp` → 200 OK
  - [ ] `POST /api/v1/auth/login` → 200 OK
  - [ ] `POST /api/v1/auth/logout` → 200 OK
- [ ] Test error handling:
  - [ ] Invalid mobile → 422 VALIDATION_ERROR
  - [ ] Wrong password → 401 INVALID_CREDENTIALS
  - [ ] Rate limit → 429 RATE_LIMITED
- [ ] No regressions in existing functionality

---

## TESTING COMMANDS

```bash
# Lint check
npm run lint

# Build check
npm run build

# Start dev server
npm run dev

# Database operations
prisma studio              # Browse database
prisma format             # Format schema
prisma validate           # Validate schema

# Manual API testing (using curl or Postman)
curl -X POST http://localhost:3000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile":"09121234567"}'
```

---

## TIMELINE ESTIMATE

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Validators Centralization | 30 min | 📝 |
| 2 | Error Code Standardization | 30 min | 📝 |
| 3 | Logger Abstraction | 20 min | 📝 |
| 4 | DB Query Helpers | 45 min | 📝 |
| 5 | Response Helpers | 20 min | 📝 |
| 6 | Update Routes | 180 min | 📝 |
| **Testing** | Verification | 30 min | 📝 |
| **Documentation** | Comments & Docs | 30 min | 📝 |
| **TOTAL** | | **~405 min** | **~7 hours** |

---

## COMMON PITFALLS TO AVOID

### ❌ Don't
- Modify existing working routes before updating to use new utils
- Create validators without testing them
- Forget to update imports in all route files
- Change response format - keep it consistent
- Remove error logging when refactoring

### ✅ Do
- Test each new utility before integrating
- Update one route at a time, verify each
- Use constants instead of magic strings
- Keep backward compatibility
- Add JSDoc comments to new functions

---

## ROLLBACK PLAN

If something breaks during refactoring:

1. **Identify the breaking change** using `npm run build` output
2. **Isolate the route** - revert that specific route's changes
3. **Re-test** that route with old validation
4. **Debug** - figure out what went wrong
5. **Fix in smaller steps** - don't change everything at once

**Git workflow**:
```bash
git status                  # See what changed
git diff src/app/api/      # See the changes
git checkout -- <file>     # Revert a file
git reset --hard           # Revert everything
```

---

## NEXT STEPS (After Refactoring Complete)

1. ✅ Commit refactoring changes to Git
2. ✅ Create `AUTH_SETUP.md` documentation
3. ✅ Create `API_INTEGRATION_GUIDE.md` for future routes
4. ✅ Create `DATABASE_SCHEMA.md` reference
5. ✅ Communicate changes to team
6. ✅ Update project worklog
7. ✅ Plan Sprint 2 features

---

**Ready to implement? Start with Phase 1! 🚀**

