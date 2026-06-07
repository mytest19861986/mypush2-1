import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { AuditActions } from '@/lib/audit'
import { calculateCommissionAmount, getPlanCommissionPercent } from '@/lib/commissions'
import {
  addDays,
  canManageSalesCustomers,
  isSafeId,
  maskNationalCode,
  toSafeSalesCustomerResponse,
} from '@/lib/sales-customers'
import { getClientIp } from '@/app/api/v1/auth/_helpers'

class ConfirmSalesCustomerError extends Error {
  constructor(
    public code:
      | 'DUPLICATE_ACTIVE_PLAN'
      | 'SALES_CUSTOMER_ALREADY_CONFIRMED'
      | 'SALES_CUSTOMER_RETURNED'
  ) {
    super(code)
  }
}

// PATCH /api/v1/sales-customers/[id]/confirm - Final admin confirmation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    if (!canManageSalesCustomers(payload)) {
      return errorResponse('FORBIDDEN', 'Sales customer management permission required', 403)
    }

    const { id } = await params
    if (!isSafeId(id)) {
      return errorResponse('VALIDATION_ERROR', 'Invalid sales customer id', 400)
    }

    const salesCustomer = await db.salesCustomer.findUnique({
      where: { id },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            status: true,
            price: true,
            durationDays: true,
            maxUses: true,
            salesPartnerCommissionPercent: true,
          },
        },
        salesPartner: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!salesCustomer) {
      return errorResponse('NOT_FOUND', 'Sales customer not found', 404)
    }

    if (!salesCustomer.nationalCode || !/^\d{10}$/.test(salesCustomer.nationalCode)) {
      return errorResponse('VALIDATION_ERROR', 'Valid 10-digit national code is required', 400)
    }

    if (salesCustomer.status === 'RETURNED') {
      return errorResponse('CONFLICT', 'Returned sales customer cannot be confirmed', 409)
    }

    if (salesCustomer.status === 'CONFIRMED') {
      return errorResponse('CONFLICT', 'Sales customer is already confirmed', 409)
    }

    if (salesCustomer.status !== 'PAID') {
      return errorResponse('BAD_REQUEST', 'Sales customer must be marked as paid before confirmation', 400)
    }

    if (salesCustomer.plan.status !== 'ACTIVE') {
      return errorResponse('BAD_REQUEST', 'Plan is not active', 400)
    }

    const now = new Date()
    const endDate = addDays(now, salesCustomer.plan.durationDays)
    const ip = getClientIp(request)
    const device = request.headers.get('user-agent') || undefined

    const confirmedSalesCustomer = await db.$transaction(async (tx) => {
      const currentSalesCustomer = await tx.salesCustomer.findUnique({
        where: { id },
        select: { id: true, status: true },
      })

      if (!currentSalesCustomer) {
        throw new Error('SALES_CUSTOMER_NOT_FOUND_IN_TRANSACTION')
      }

      if (currentSalesCustomer.status === 'RETURNED') {
        throw new ConfirmSalesCustomerError('SALES_CUSTOMER_RETURNED')
      }

      if (currentSalesCustomer.status === 'CONFIRMED') {
        throw new ConfirmSalesCustomerError('SALES_CUSTOMER_ALREADY_CONFIRMED')
      }

      const existingPlanHolder = await tx.planHolder.findUnique({
        where: { nationalCode: salesCustomer.nationalCode! },
        select: { id: true, userId: true },
      })

      const planHolderData = {
        firstName: salesCustomer.firstName,
        lastName: salesCustomer.lastName,
        mobile: salesCustomer.mobile,
        status: 'ACTIVE',
      }

      const planHolder = existingPlanHolder
        ? existingPlanHolder.userId
          ? existingPlanHolder
          : await tx.planHolder.update({
              where: { id: existingPlanHolder.id },
              data: planHolderData,
              select: { id: true, userId: true },
            })
        : await tx.planHolder.create({
            data: {
              nationalCode: salesCustomer.nationalCode!,
              ...planHolderData,
            },
            select: { id: true, userId: true },
          })

      const duplicateActivePlan = await tx.userPlan.findFirst({
        where: {
          planHolderId: planHolder.id,
          planId: salesCustomer.planId,
          status: 'ACTIVE',
          endDate: { gte: now },
        },
        select: { id: true },
      })

      if (duplicateActivePlan) {
        throw new ConfirmSalesCustomerError('DUPLICATE_ACTIVE_PLAN')
      }

      const userPlan = await tx.userPlan.create({
        data: {
          userId: planHolder.userId,
          planHolderId: planHolder.id,
          planId: salesCustomer.planId,
          paymentId: null,
          source: 'SALES_CONFIRMED',
          status: 'ACTIVE',
          startDate: now,
          endDate,
          remainingUses: salesCustomer.plan.maxUses ?? -1,
          totalUses: 0,
        },
      })

      const commissionPercent = getPlanCommissionPercent(salesCustomer.plan, 'SALES_PARTNER')
      const commission = commissionPercent
        ? await tx.commission.create({
            data: {
              agentId: salesCustomer.salesPartnerId,
              userPlanId: userPlan.id,
              percent: commissionPercent,
              amount: calculateCommissionAmount(salesCustomer.plan.price, commissionPercent),
              status: 'PENDING',
            },
          })
        : null

      if (!commissionPercent) {
        console.info('[sales-customers/confirm] Skipped commission: plan commission percent is zero', {
          salesCustomerId: salesCustomer.id,
          planId: salesCustomer.planId,
          salesPartnerId: salesCustomer.salesPartnerId,
        })
      }

      const updatedSalesCustomer = await tx.salesCustomer.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: now,
          userPlanId: userPlan.id,
        },
        include: {
          plan: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      await tx.auditLog.createMany({
        data: [
          {
            userId: payload.sub,
            action: AuditActions.SALES_CUSTOMER_CONFIRMED,
            entity: 'SalesCustomer',
            entityId: updatedSalesCustomer.id,
            details: JSON.stringify({
              salesCustomerId: updatedSalesCustomer.id,
              salesPartnerId: salesCustomer.salesPartnerId,
              planHolderId: planHolder.id,
              userPlanId: userPlan.id,
              commissionId: commission?.id,
              nationalCode: maskNationalCode(salesCustomer.nationalCode),
            }),
            ip,
            device,
          },
          {
            userId: payload.sub,
            action: AuditActions.USER_PLAN_CREATED,
            entity: 'UserPlan',
            entityId: userPlan.id,
            details: JSON.stringify({
              userPlanId: userPlan.id,
              planHolderId: planHolder.id,
              planId: salesCustomer.planId,
              source: 'SALES_CONFIRMED',
              salesCustomerId: updatedSalesCustomer.id,
              nationalCode: maskNationalCode(salesCustomer.nationalCode),
            }),
            ip,
            device,
          },
          ...(commission
            ? [
                {
                  userId: payload.sub,
                  action: AuditActions.COMMISSION_CREATED,
                  entity: 'Commission',
                  entityId: commission.id,
                  details: JSON.stringify({
                    commissionId: commission.id,
                    agentId: salesCustomer.salesPartnerId,
                    userPlanId: userPlan.id,
                    amount: commission.amount,
                    percent: commission.percent,
                    status: 'PENDING',
                    salesCustomerId: updatedSalesCustomer.id,
                  }),
                  ip,
                  device,
                },
              ]
            : []),
        ],
      })

      return updatedSalesCustomer
    })

    return successResponse(
      toSafeSalesCustomerResponse(confirmedSalesCustomer),
      'Sales customer confirmed successfully'
    )
  } catch (err) {
    if (err instanceof ConfirmSalesCustomerError) {
      if (err.code === 'DUPLICATE_ACTIVE_PLAN') {
        return errorResponse('CONFLICT', 'Active plan already exists for this plan holder and plan', 409)
      }

      if (err.code === 'SALES_CUSTOMER_RETURNED') {
        return errorResponse('CONFLICT', 'Returned sales customer cannot be confirmed', 409)
      }

      if (err.code === 'SALES_CUSTOMER_ALREADY_CONFIRMED') {
        return errorResponse('CONFLICT', 'Sales customer is already confirmed', 409)
      }
    }

    console.error('[PATCH /api/v1/sales-customers/[id]/confirm]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
