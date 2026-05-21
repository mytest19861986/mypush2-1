import {
  UserStatus, DoctorStatus, AgentStatus, DocumentType, DocumentStatus,
  PlanStatus, UserPlanStatus, ContractStatus, CommissionStatus
} from '@/types'

// ─── Status Labels (Persian) ───
export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'فعال',
  INACTIVE: 'غیرفعال',
  BLOCKED: 'مسدود',
}

export const DOCTOR_STATUS_LABELS: Record<DoctorStatus, string> = {
  PENDING: 'در انتظار تأیید',
  APPROVED: 'تأیید شده',
  REJECTED: 'رد شده',
  SUSPENDED: 'معلق',
}

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  PENDING: 'در انتظار بررسی',
  UNDER_REVIEW: 'در حال بررسی',
  APPROVED: 'تأیید شده',
  REJECTED: 'رد شده',
  SUSPENDED: 'معلق',
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  NATIONAL_CARD: 'کارت ملی',
  BUSINESS_LICENSE: 'جواز کسب',
  CERTIFICATE: 'گواهینامه',
  OTHER: 'سایر',
}

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  PENDING: 'در انتظار بررسی',
  APPROVED: 'تأیید شده',
  REJECTED: 'رد شده',
}

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  ACTIVE: 'فعال',
  INACTIVE: 'غیرفعال',
}

export const USER_PLAN_STATUS_LABELS: Record<UserPlanStatus, string> = {
  ACTIVE: 'فعال',
  EXPIRED: 'منقضی شده',
  CANCELLED: 'لغو شده',
}

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  PENDING: 'در انتظار',
  CONFIRMED: 'تأیید شده',
  COMPLETED: 'تکمیل شده',
  CANCELLED: 'لغو شده',
}

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  PENDING: 'در انتظار',
  APPROVED: 'تأیید شده',
  PAID: 'پرداخت شده',
  CANCELLED: 'لغو شده',
}

// ─── Status Color Classes ───
export const STATUS_VARIANT_MAP: Record<string, string> = {
  // User
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  INACTIVE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  BLOCKED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  // Doctor/Agent
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  UNDER_REVIEW: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  SUSPENDED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  // Plan
  PLAN_ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PLAN_INACTIVE: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  // Contract
  CONFIRMED: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  // Commission
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

// ─── Audit Log Labels ───
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  USER_LOGIN: 'ورود کاربر',
  USER_LOGOUT: 'خروج کاربر',
  USER_UPDATED: 'بروزرسانی کاربر',
  USER_STATUS_CHANGED: 'تغییر وضعیت کاربر',
  ROLE_UPDATED: 'بروزرسانی نقش',
  PERMISSION_UPDATED: 'بروزرسانی دسترسی',
  AGENT_CREATED: 'ثبت نماینده',
  AGENT_UPDATED: 'بروزرسانی نماینده',
  AGENT_STATUS_CHANGED: 'تغییر وضعیت نماینده',
  DOCUMENT_UPLOADED: 'آپلود مدرک',
  DOCUMENT_REVIEWED: 'بررسی مدرک',
  UPLOAD_CREATED: 'آپلود فایل',
  PLAN_CREATED: 'ایجاد طرح',
  PLAN_UPDATED: 'بروزرسانی طرح',
  PLAN_DELETED: 'حذف طرح',
  CONTRACT_CREATED: 'ثبت قرارداد',
  COMMISSION_CREATED: 'ثبت پورسانت',
}

export const ENTITY_LABELS: Record<string, string> = {
  User: 'کاربر',
  Agent: 'نماینده',
  Doctor: 'پزشک',
  Plan: 'طرح',
  Contract: 'قرارداد',
  Commission: 'پورسانت',
  Role: 'نقش',
  Permission: 'دسترسی',
  Document: 'مدرک',
}

// ─── Roles ───
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SUPPORT: 'SUPPORT',
  DOCTOR: 'DOCTOR',
  AGENT: 'AGENT',
  USER: 'USER',
} as const

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'مدیر کل',
  ADMIN: 'مدیر',
  SUPPORT: 'پشتیبان',
  DOCTOR: 'پزشک',
  AGENT: 'نماینده',
  USER: 'کاربر',
}

// ─── Permissions ───
export const PERMISSION_MODULES: Record<string, string> = {
  users: 'کاربران',
  agents: 'نمایندگان',
  doctors: 'پزشکان',
  plans: 'طرح‌ها',
  contracts: 'قراردادها',
  reports: 'گزارشات',
  roles: 'نقش‌ها',
}

// ─── App Info ───
export const APP_NAME = 'حامی کارت'
export const APP_FULL_NAME = 'سامانه تخفیف درمانی حامی کارت'
export const APP_URL = 'https://hamicard.ir'

// ─── Pagination ───
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// ─── File Upload ───
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const ACCEPTED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
