# Complete Integration Guide - Auth Module

**Objective:** Integrate Sprint 1 Auth with existing codebase  
**Duration:** 2-3 weeks  
**Approach:** Controlled, step-by-step  
**AI-Friendly:** Yes, clear patterns throughout

---

## DECISION TREE FOR EACH EXISTING COMPONENT

### For Each File/Function/Component:

```
┌─ Is it related to auth/security? ─────────┐
│                                             │
├─ YES ──────────────────────────────────────┤
│  ├─ Is it working correctly?               │
│  │  ├─ YES: Keep but enhance               │
│  │  └─ NO: Replace with new auth           │
│  │                                         │
│  └─ Is it duplicated elsewhere?            │
│     ├─ YES: Consolidate into service       │
│     └─ NO: Move to service layer           │
│                                             │
└─ NO ──────────────────────────────────────┘
  ├─ Is it well-structured?
  │  ├─ YES: Keep as-is
  │  └─ NO: Refactor (lower priority)
  │
  └─ Does it depend on auth?
     ├─ YES: Add auth guards
     └─ NO: Leave alone
```

---

## INTEGRATION ROADMAP

### ✅ STEP 1: MERGE STRATEGIC ANALYSIS

**What to do:**
1. Review this entire document
2. Review ARCHITECTURE_ANALYSIS.md
3. Review MIGRATION_STRATEGY.md
4. Review IMPLEMENTATION_CHECKLIST.md

**Time:** 2 hours

**Success criteria:**
- [ ] Team aligned on approach
- [ ] No questions about strategy
- [ ] Everyone understands risks
- [ ] Go/No-Go decision made

### ✅ STEP 2: DATABASE SCHEMA MERGE

**What to do:**

1. **Backup production database**
```bash
pg_dump $DATABASE_URL > backup_pre_auth_$(date +%s).sql
```

2. **Extend User model** (don't replace)
```prisma
model User {
  // EXISTING - Keep these
  id                    String    @id @default(cuid())
  email                 String    @unique
  name                  String?
  
  // NEW - Add these
  emailVerified         DateTime?
  passwordHash          String?
  twoFactorEnabled      Boolean   @default(false)
  lastLogin             DateTime?
  loginAttempts         Int       @default(0)
  lockedUntil           DateTime?
  
  // EXISTING relations - Keep
  profile               Profile?
  skills                Skill[]
  agents                AgentConfig[]
  
  // NEW relations - Add
  sessions              Session[]
  refreshTokens         RefreshToken[]
  
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  deletedAt             DateTime?  // Soft delete for compliance
}

// NEW TABLES
model Session {
  id                    String    @id @default(cuid())
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  token                 String    @unique
  expiresAt             DateTime
  ipAddress             String?
  userAgent             String?
  
  createdAt             DateTime  @default(now())
  
  @@index([userId])
  @@index([expiresAt])  // For cleanup jobs
}

model RefreshToken {
  id                    String    @id @default(cuid())
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  token                 String    @unique
  expiresAt             DateTime
  revokedAt             DateTime?
  
  createdAt             DateTime  @default(now())
  
  @@index([userId])
  @@index([expiresAt])
}
```

3. **Create and test migration**
```bash
cd prisma
npx prisma migrate dev --name add_auth_support
```

4. **Verify migration worked**
```bash
npx prisma db execute --stdin < verify.sql
```

**Time:** 3-4 hours

**Success criteria:**
- [ ] All new tables created
- [ ] All new fields added
- [ ] Indexes created
- [ ] No data loss
- [ ] Rollback tested

### ✅ STEP 3: SERVICE LAYER EXTRACTION

**What to do:**

1. **Create service directory structure**
```bash
mkdir -p src/services/auth
mkdir -p src/services/user
mkdir -p src/services/email
mkdir -p src/lib/validation
```

2. **Extract password service** (src/services/auth/passwordService.ts)
```typescript
import bcrypt from 'bcryptjs';

export class PasswordService {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hash password with bcrypt
   */
  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify password against hash
   */
  static async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
```

3. **Extract session service** (src/services/auth/sessionService.ts)
```typescript
import { prisma } from '@/lib/prisma';

export class SessionService {
  /**
   * Create new session for user
   */
  static async createSession(userId: string, metadata: {
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.session.create({
      data: {
        userId,
        token: this.generateToken(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    });
  }

  /**
   * Verify session exists and is valid
   */
  static async verifySession(token: string) {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) return null;
    if (new Date() > session.expiresAt) {
      await prisma.session.delete({ where: { id: session.id } });
      return null;
    }

    return session;
  }

  /**
   * Revoke session (logout)
   */
  static async revokeSession(token: string) {
    return prisma.session.delete({
      where: { token },
    });
  }

  private static generateToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }
}
```

4. **Extract token service** (src/services/auth/tokenService.ts)
```typescript
import jwt from 'jsonwebtoken';

export class TokenService {
  private static readonly ACCESS_TOKEN_EXPIRY = '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';

  /**
   * Generate JWT access token
   */
  static generateAccessToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'access' },
      process.env.JWT_SECRET!,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    );
  }

  /**
   * Verify JWT access token
   */
  static verifyAccessToken(token: string): { userId: string } | null {
    try {
      return jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    } catch {
      return null;
    }
  }
}
```

5. **Extract user service** (src/services/user/userService.ts)
```typescript
import { prisma } from '@/lib/prisma';
import { PasswordService } from '@/services/auth/passwordService';

export class UserService {
  /**
   * Get user by email safely
   */
  static async getUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Create new user with password
   */
  static async createUser(email: string, password: string, name: string) {
    // Check if user exists
    const existing = await this.getUserByEmail(email);
    if (existing) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await PasswordService.hash(password);

    // Create user
    return prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash,
      },
    });
  }

  /**
   * Get user by ID (safe for API responses)
   */
  static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    // Remove sensitive fields
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
```

**Time:** 4-5 hours

**Success criteria:**
- [ ] All services created
- [ ] Services tested independently
- [ ] No sensitive data exposed
- [ ] Proper error handling

### ✅ STEP 4: API ROUTES MIGRATION

**What to do:**

1. **Create auth endpoints** (src/app/api/auth/*)

   **POST /api/auth/signup**
   ```typescript
   // src/app/api/auth/signup/route.ts
   import { NextRequest, NextResponse } from 'next/server';
   import { z } from 'zod';
   import { UserService } from '@/services/user/userService';
   import { TokenService } from '@/services/auth/tokenService';
   import { SessionService } from '@/services/auth/sessionService';

   const signupSchema = z.object({
     email: z.string().email(),
     password: z.string().min(8),
     name: z.string().min(2),
   });

   export async function POST(req: NextRequest) {
     try {
       const body = await req.json();
       const { email, password, name } = signupSchema.parse(body);

       // Create user
       const user = await UserService.createUser(email, password, name);

       // Create session
       const session = await SessionService.createSession(user.id, {
         ipAddress: req.headers.get('x-forwarded-for') || undefined,
         userAgent: req.headers.get('user-agent') || undefined,
       });

       // Generate tokens
       const accessToken = TokenService.generateAccessToken(user.id);

       return NextResponse.json({
         success: true,
         user: {
           id: user.id,
           email: user.email,
           name: user.name,
         },
         accessToken,
         refreshToken: session.token,
       }, { status: 201 });
     } catch (error) {
       if (error instanceof z.ZodError) {
         return NextResponse.json({
           success: false,
           error: 'Validation error',
           details: error.errors,
         }, { status: 422 });
       }

       return NextResponse.json({
         success: false,
         error: error instanceof Error ? error.message : 'Signup failed',
       }, { status: 400 });
     }
   }
   ```

   **POST /api/auth/login**
   ```typescript
   // Similar to signup but verifies password
   ```

   **POST /api/auth/logout**
   ```typescript
   // Revoke session
   ```

   **POST /api/auth/refresh**
   ```typescript
   // Generate new access token from refresh token
   ```

2. **Update existing routes** to use services

   Before:
   ```typescript
   // OLD: Direct DB access in route
   export async function POST(req) {
     const user = await prisma.user.create({ ... });
     return Response.json(user);
   }
   ```

   After:
   ```typescript
   // NEW: Use service layer
   export async function POST(req) {
     const user = await UserService.createUser(...);
     return Response.json(user);
   }
   ```

**Time:** 5-6 hours

**Success criteria:**
- [ ] All auth endpoints working
- [ ] All existing endpoints updated
- [ ] All endpoints tested
- [ ] No breaking changes

### ✅ STEP 5: FRONTEND STATE MANAGEMENT

**What to do:**

1. **Create auth store** (src/stores/authStore.ts)
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: any | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: any) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();

          set({
            user: data.user,
            token: data.accessToken,
            error: null,
          });
        } catch (error) {
          set({ error: 'Login failed' });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        set({ user: null, token: null });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
    }
  )
);
```

2. **Create auth context** (optional, if preferring Context API)

3. **Create hooks** (src/hooks/useAuth.ts)
```typescript
import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  return useAuthStore();
}

export function useRequireAuth() {
  const { user } = useAuthStore();
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  return user;
}
```

4. **Create protected route wrapper**
```typescript
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <Redirect to="/login" />;

  return children;
}
```

**Time:** 2-3 hours

**Success criteria:**
- [ ] State management working
- [ ] Token persistence working
- [ ] Hooks functional
- [ ] Protected routes working

### ✅ STEP 6: TESTING & VALIDATION

**What to do:**

1. **Unit tests**
```bash
npm run test -- src/services
```

2. **Integration tests**
```bash
npm run test -- src/app/api
```

3. **E2E tests**
```bash
npm run test:e2e
```

4. **Manual testing**
- Signup flow
- Login flow
- Logout flow
- Token refresh
- Protected routes

**Time:** 3-4 hours

**Success criteria:**
- [ ] All tests passing
- [ ] 70%+ coverage
- [ ] No regressions
- [ ] Manual tests successful

### ✅ STEP 7: DEPLOYMENT

**Staging:**
```bash
git push origin feat/auth-integration
# Trigger staging deployment
npm run test:staging
```

**Production:**
```bash
# After staging validation
git merge feat/auth-integration
git push origin main
# Trigger production deployment
# Monitor for 24 hours
```

**Time:** 2-4 hours

**Success criteria:**
- [ ] Deployed successfully
- [ ] No errors in logs
- [ ] All endpoints accessible
- [ ] Performance acceptable

---

## QUICK REFERENCE: FILE CHECKLIST

### Create These Files:
```
✅ src/services/auth/passwordService.ts
✅ src/services/auth/sessionService.ts
✅ src/services/auth/tokenService.ts
✅ src/services/user/userService.ts
✅ src/services/email/emailService.ts
✅ src/app/api/auth/signup/route.ts
✅ src/app/api/auth/login/route.ts
✅ src/app/api/auth/logout/route.ts
✅ src/app/api/auth/refresh/route.ts
✅ src/app/api/middleware/auth.ts
✅ src/stores/authStore.ts
✅ src/hooks/useAuth.ts
✅ src/components/ProtectedRoute.tsx
✅ src/lib/validation/auth.ts
```

### Modify These Files:
```
✅ prisma/schema.prisma (add tables)
✅ .env.local (add JWT_SECRET)
✅ package.json (add bcryptjs, jsonwebtoken)
✅ All existing routes (use services)
✅ All components (add auth checks)
```

### Delete These Files:
```
❌ Any old auth attempts
❌ Duplicate user creation code
❌ Old validation code
❌ src/pages/* (if exists)
```

---

## COMMON ISSUES & SOLUTIONS

### Issue: Type errors after adding auth
**Solution:** Run `npm run type-check`, update types as needed

### Issue: Tests failing
**Solution:** Mock services, use test database, check jest config

### Issue: Token not persisting
**Solution:** Check localStorage permissions, verify zustand persist

### Issue: CORS errors
**Solution:** Add CORS middleware to auth routes

### Issue: Database migration fails
**Solution:** Check backup exists, review migration SQL, try on test DB first

---

## SUCCESS METRICS

Track these after deployment:

```
Functionality:
- ✅ Signup success rate > 99%
- ✅ Login success rate > 99%
- ✅ Token refresh working
- ✅ Protected routes accessible

Performance:
- ✅ Signup time < 500ms
- ✅ Login time < 300ms
- ✅ Token refresh < 100ms

Security:
- ✅ No password leaks
- ✅ No token exposure
- ✅ Rate limiting active
- ✅ CORS configured

User Experience:
- ✅ Clear error messages
- ✅ Loading states present
- ✅ No console errors
- ✅ Mobile responsive
```

---

## TEAM COMMUNICATION

### Before starting:
- [ ] Share all 4 documents with team
- [ ] Conduct architecture review meeting
- [ ] Assign responsibilities
- [ ] Set timeline expectations

### During development:
- [ ] Daily standup updates
- [ ] Share progress on each phase
- [ ] Report blockers immediately
- [ ] Ask for help when needed

### After completion:
- [ ] Celebrate success! 🎉
- [ ] Document lessons learned
- [ ] Update onboarding docs
- [ ] Plan next improvements

---

**YOU'RE READY TO START!** 🚀

All documentation is complete. Begin with Step 1 of the Integration Roadmap.
