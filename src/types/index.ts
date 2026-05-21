// ─── User Types ───
export interface UserProfile {
  firstName: string | null
  lastName: string | null
  nationalCode: string | null
  avatar: string | null
  birthDate?: string | null
  gender?: string | null
  address?: string | null
}

export interface AuthUser {
  id: string
  mobile: string
  email: string | null
  isMobileVerified: boolean
  status: string
  roles: string[]
  permissions: string[]
  profile: UserProfile | null
}

// ─── API Types ───
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: ApiError
  pagination?: PaginationMeta
}

export interface ApiError {
  code: string
  message: string
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  success: true
  data: T[]
  pagination: PaginationMeta
}

// ─── User Management ───
export interface UserItem {
  id: string
  mobile: string
  email: string | null
  status: UserStatus
  isMobileVerified: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  profile: UserProfile | null
  roles: RoleItem[]
}

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED'

// ─── Roles & Permissions ───
export interface RoleItem {
  id: string
  name: string
  title: string
  description?: string | null
  permissions?: PermissionItem[]
  userCount?: number
}

export interface PermissionItem {
  id: string
  name: string
  module: string
  title?: string | null
}

// ─── Doctor ───
export interface DoctorItem {
  id: string
  userId: string
  medicalCode?: string | null
  specialty?: string | null
  clinicName?: string | null
  clinicAddress?: string | null
  city?: string | null
  province?: string | null
  phone?: string | null
  bio?: string | null
  discountPercent?: number
  status: DoctorStatus
  verifiedAt?: string | null
  createdAt: string
  user?: {
    mobile: string
    profile?: UserProfile | null
  }
  contracts?: ContractItem[]
}

export type DoctorStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'

// ─── Agent ───
export interface AgentItem {
  id: string
  userId: string
  businessName?: string | null
  status: AgentStatus
  score: number
  description?: string | null
  verifiedAt?: string | null
  createdAt: string
  user?: {
    mobile: string
    email?: string | null
    profile?: UserProfile | null
    status?: string
    roles?: { id: string; name: string; title: string }[]
  }
  documents?: AgentDocumentItem[]
  documentCount?: number
}

export type AgentStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'

export interface AgentDocumentItem {
  id: string
  agentId: string
  type: DocumentType
  file: string
  status: DocumentStatus
  reviewedBy?: string | null
  reviewedAt?: string | null
  createdAt: string
  reviewer?: { profile?: UserProfile | null }
}

export type DocumentType = 'NATIONAL_CARD' | 'BUSINESS_LICENSE' | 'CERTIFICATE' | 'OTHER'
export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

// ─── Discount Plans ───
export interface DiscountPlanItem {
  id: string
  name: string
  description?: string | null
  price: number
  discountPercent: number
  durationDays: number
  maxUses: number
  status: PlanStatus
  features?: string | null
  createdAt: string
  updatedAt: string
  userCount?: number
}

export type PlanStatus = 'ACTIVE' | 'INACTIVE'

// ─── User Plans (Purchases) ───
export interface UserPlanItem {
  id: string
  userId: string
  planId: string
  referrerId?: string | null
  status: UserPlanStatus
  startDate: string
  endDate: string
  remainingUses: number
  totalUses: number
  paymentRef?: string | null
  createdAt: string
  plan: {
    id: string
    name: string
    description?: string | null
    discountPercent: number
    durationDays: number
    maxUses: number
    features?: string | null
  }
}

export type UserPlanStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED'

// ─── Contracts (Visits) ───
export interface ContractItem {
  id: string
  userId: string
  userPlanId: string
  doctorId: string
  patientNote?: string | null
  doctorNote?: string | null
  diagnosis?: string | null
  prescriptions?: string | null
  discountAmount: number
  totalAmount: number
  status: ContractStatus
  confirmedAt?: string | null
  completedAt?: string | null
  createdAt: string
  user?: {
    mobile: string
    profile?: UserProfile | null
  }
  userPlan?: UserPlanItem
  doctor?: {
    specialty?: string | null
    clinicName?: string | null
    user?: { profile?: UserProfile | null }
  }
}

export type ContractStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

// ─── Commissions ───
export interface CommissionItem {
  id: string
  agentId: string
  userPlanId: string
  amount: number
  percent: number
  status: CommissionStatus
  paidAt?: string | null
  createdAt: string
  userPlan?: UserPlanItem
  agent?: { profile?: UserProfile | null }
}

export type CommissionStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED'

// ─── Audit Logs ───
export interface AuditLogItem {
  id: string
  userId?: string | null
  action: string
  entity?: string | null
  entityId?: string | null
  details?: unknown
  ip?: string | null
  device?: string | null
  createdAt: string
  user?: {
    profile?: UserProfile | null
    mobile?: string
  }
}

// ─── Patient Lookup ───
export interface PatientLookupResult {
  id: string
  mobile: string
  profile?: UserProfile | null
  activePlans: (UserPlanItem & { remainingUses: number })[]
}

// ─── Dashboard Stats ───
export interface DashboardStats {
  totalUsers: number
  totalDoctors: number
  totalAgents: number
  pendingAgents: number
  activePlans: number
  todayContracts: number
  monthlyRevenue: number
  totalLogs: number
  todayLogs: number
  topActions: { action: string; count: number }[]
  topUsers: { userId: string; name: string | null; mobile: string | null; count: number }[]
  recentActions: AuditLogItem[]
}
