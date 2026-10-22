import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { normalizeMobile } from '@/lib/phone'
import { assertNoDoctorConflict } from '@/lib/role-integrity'


const adminCreateAgentSchema = z.object({
  mobile: z
    .string()
    .transform(normalizeMobile)
    .refine((val) => /^09\d{9}$/.test(val), {
      message: 'فرمت شماره موبایل نامعتبر است (مثال: 09121234567)',
    }),
  firstName: z.string().trim().min(2, 'نام باید حداقل ۲ حرف باشد').max(50),
  lastName: z.string().trim().min(2, 'نام خانوادگی باید حداقل ۲ حرف باشد').max(50),
  nationalCode: z.string().trim().regex(/^\d{10}$/, 'کد ملی باید ۱۰ رقم باشد').optional().or(z.literal('')),
  businessName: z.string().trim().min(1, 'نام تجاری یا عنوان نمایندگی الزامی است'),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  address: z.string().trim().max(255).optional().or(z.literal('')),
})

// POST /api/v1/admin/agents — Create agent profile by administrator (Preserving PENDING state)
export async function POST(request: NextRequest) {
  try {
    const { authorized, payload, error } = await requirePermission(request, 'manage_agents')
    if (!authorized) {
      return errorResponse('UNAUTHORIZED', error || 'دسترسی مجاز نیست', payload ? 403 : 401)
    }

    const body = await request.json()
    const parsed = adminCreateAgentSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return errorResponse('VALIDATION_ERROR', firstError?.message || 'اطلاعات وارد شده نامعتبر است', 422)
    }

    const { mobile, firstName, lastName, nationalCode, businessName, description, address } = parsed.data
    const cleanNationalCode = nationalCode && nationalCode.length === 10 ? nationalCode : null

    // Check user by mobile
    let user = await db.user.findUnique({ where: { mobile } })
    if (user) {
      const existingAgent = await db.agent.findUnique({ where: { userId: user.id } })
      if (existingAgent) {
        return errorResponse('CONFLICT', 'برای این شماره موبایل قبلاً پرونده نمایندگی ثبت شده است', 409)
      }
    }

    // Role exclusivity check: Disallow Doctor from becoming Agent
    try {
      await assertNoDoctorConflict({ userId: user?.id, mobile })
    } catch (conflictErr: any) {
      return errorResponse('CONFLICT', conflictErr.message, 409)
    }

    // Ensure 'USER' role exists
    let userRole = await db.role.findUnique({ where: { name: 'USER' } })
    if (!userRole) {
      userRole = await db.role.create({
        data: { name: 'USER', title: 'کاربر عادی', description: 'دسترسی پایه کاربران عادی' },
      })
    }

    // Transactionally create or link User, and create Agent in PENDING status
    const agentRecord = await db.$transaction(async (tx) => {
      // Re-assert conflict inside transaction for concurrency safety
      await assertNoDoctorConflict({ userId: user?.id, mobile }, tx)

      if (!user) {
        user = await tx.user.create({
          data: {
            mobile,
            status: 'ACTIVE',

            isMobileVerified: true,
          },
        })

        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: userRole.id,
          },
        })

        await tx.userProfile.create({
          data: {
            userId: user.id,
            firstName,
            lastName,
            nationalCode: cleanNationalCode,
            address: address || null,
          },
        })
      } else {
        await tx.userProfile.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            firstName,
            lastName,
            nationalCode: cleanNationalCode,
            address: address || null,
          },
          update: {
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            nationalCode: cleanNationalCode || undefined,
            address: address || undefined,
          },
        })
      }

      // Create Agent in PENDING status per DEC56-ROLE-SAFETY
      const agent = await tx.agent.create({
        data: {
          userId: user.id,
          businessName,
          description: description || null,
          status: 'PENDING',
        },
        include: {
          user: {
            select: {
              id: true,
              mobile: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      })

      return agent
    })

    createAuditLog({
      userId: payload?.sub || agentRecord.userId,
      action: AuditActions.AGENT_CREATED,
      entity: 'Agent',
      entityId: agentRecord.id,
      details: { method: 'ADMIN_CREATE', businessName, mobile },
    })

    return successResponse(
      agentRecord,
      'پرونده نماینده با موفقیت در وضعیت در انتظار بررسی (PENDING) ثبت شد',
      201
    )
  } catch (err) {
    console.error('[POST /api/v1/admin/agents]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور در ثبت نماینده', 500)
  }
}
