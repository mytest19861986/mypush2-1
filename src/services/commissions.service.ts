import { BaseService } from './base.service'
import type { CommissionItem, CommissionSourceType, SettlementStatus } from '@/types'

export interface AgentCommissionStats {
  totalCommission: number
  paidCommission: number
  pendingCommission: number
  cancelledCommission: number
  totalReferrals: number
  activePlans: number
}

interface PayCommissionData {
  refId?: string
  description?: string
}

export interface CommissionSourceSummary {
  amount: number
  count: number
}

export interface CommissionSettlementStatusSummary {
  status: SettlementStatus
  amount: number
  count: number
}

export interface AdminCommissionSummary {
  range: {
    from: string
    to: string
  }
  totals: {
    commissionCount: number
    totalCommissionAmount: number
    pendingCommissionAmount: number
    approvedCommissionAmount: number
    withdrawableCommissionAmount: number
    paidCommissionAmount: number
    cancelledCommissionAmount: number
    openSettlementAmount: number
    paidSettlementAmount: number
  }
  sourceBreakdown: Record<CommissionSourceType, CommissionSourceSummary>
  settlementBreakdown: {
    openAmount: number
    openCount: number
    paidAmount: number
    paidCount: number
    statusBreakdown: CommissionSettlementStatusSummary[]
  }
}

export class CommissionsService extends BaseService {
  async getAgentRecentCommissions() {
    return this.get<CommissionItem[]>('/agents/commissions?limit=5')
  }

  async getAgentCommissionStats() {
    return this.get<AgentCommissionStats>('/agents/commissions?stats=true')
  }

  async getAgentCommissions(params: { page?: number; limit?: number; status?: string } = {}) {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.status && params.status !== 'all') searchParams.set('status', params.status)
    const qs = searchParams.toString()
    return this.get<CommissionItem[]>(`/agents/commissions${qs ? `?${qs}` : ''}`)
  }

  async getMyCommissions() {
    return this.get<CommissionItem[]>('/commissions/my')
  }

  async getAll(params: {
    page?: number
    limit?: number
    status?: string
    ownerSearch?: string
    sourceType?: string
    from?: string
    to?: string
  } = {}) {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.status) searchParams.set('status', params.status)
    if (params.ownerSearch) searchParams.set('ownerSearch', params.ownerSearch)
    if (params.sourceType && params.sourceType !== 'all') {
      searchParams.set('sourceType', params.sourceType)
    }
    if (params.from) searchParams.set('from', params.from)
    if (params.to) searchParams.set('to', params.to)
    return this.get<CommissionItem[]>(`/commissions?${searchParams.toString()}`)
  }

  async getAdminSummary(params: {
    status?: string
    ownerSearch?: string
    sourceType?: string
    from?: string
    to?: string
  } = {}) {
    const searchParams = new URLSearchParams()
    if (params.status) searchParams.set('status', params.status)
    if (params.ownerSearch) searchParams.set('ownerSearch', params.ownerSearch)
    if (params.sourceType && params.sourceType !== 'all') {
      searchParams.set('sourceType', params.sourceType)
    }
    if (params.from) searchParams.set('from', params.from)
    if (params.to) searchParams.set('to', params.to)
    const qs = searchParams.toString()
    return this.get<AdminCommissionSummary>(`/admin/commissions/summary${qs ? `?${qs}` : ''}`)
  }

  async getById(id: string) {
    return this.get<CommissionItem>(`/commissions/${id}`)
  }

  async approve(id: string) {
    return this.patch<CommissionItem>(`/commissions/${id}/approve`)
  }

  async cancel(id: string, reason?: string) {
    return this.patch<CommissionItem>(
      `/commissions/${id}/cancel`,
      reason ? { reason } : undefined
    )
  }

  async pay(id: string, data?: PayCommissionData) {
    return this.post<CommissionItem>(`/commissions/${id}/pay`, data)
  }
}

export const commissionsService = new CommissionsService()
