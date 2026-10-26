import { z } from 'zod'

export const callDirections = { INBOUND: 'ورودی', OUTBOUND: 'خروجی' } as const
export const callTopics = { REGISTRATION: 'ثبت‌نام', DOCUMENTS: 'مدارک', PAYMENT: 'پیگیری مالی', SUPPORT: 'پشتیبانی', OTHER: 'سایر امور اجرایی' } as const
export const callOutcomes = { COMPLETED: 'انجام شد', NO_ANSWER: 'پاسخ داده نشد', FOLLOW_UP: 'نیاز به پیگیری', CANCELLED: 'لغو شد' } as const
export const callFollowUpStatuses = { NONE: 'بدون پیگیری', PENDING: 'در انتظار پیگیری', DONE: 'پیگیری شد' } as const

export const createCallLogSchema = z.object({
  clientRequestId: z.string().uuid(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  direction: z.enum(['INBOUND', 'OUTBOUND']),
  topic: z.enum(['REGISTRATION', 'DOCUMENTS', 'PAYMENT', 'SUPPORT', 'OTHER']),
  outcome: z.enum(['COMPLETED', 'NO_ANSWER', 'FOLLOW_UP', 'CANCELLED']),
  subjectUserId: z.string().trim().min(1).max(100).optional(),
  followUpStatus: z.enum(['NONE', 'PENDING', 'DONE']).default('NONE'),
  followUpAt: z.string().datetime({ offset: true }).optional(),
  note: z.string().trim().max(500, 'یادداشت حداکثر ۵۰۰ نویسه است.').optional(),
}).strict().superRefine((value, context) => {
  if (value.followUpStatus === 'PENDING' && !value.followUpAt) {
    context.addIssue({ code: 'custom', path: ['followUpAt'], message: 'تاریخ پیگیری را انتخاب کنید.' })
  }
  if (value.followUpAt && value.followUpStatus !== 'PENDING') {
    context.addIssue({ code: 'custom', path: ['followUpAt'], message: 'تاریخ پیگیری فقط برای وضعیت در انتظار پیگیری مجاز است.' })
  }
})

export type CreateCallLogInput = z.input<typeof createCallLogSchema>
