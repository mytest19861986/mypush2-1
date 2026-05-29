import { BaseService } from './base.service'
import type { CommissionItem } from '@/types'

export interface AgentCommissionStats {
  totalCommission: number
  paidCommission: number
  pendingCommission: number
  cancelledCommission: number
  totalReferrals: number
  activePlans: number
}

export class CommissionsService extends BaseService {
  async getAgentRecentCommissions() {
    return this.get<CommissionItem[]>('/agents/commissions?limit=5')
  }

  async getAgentCommissionStats() {
    return this.get<AgentCommissionStats>('/agents/commissions?stats=true')
  }

  async getMyCommissions() {
    return this.get<CommissionItem[]>('/commissions/my')
  }

  async getAll(params: { page?: number; limit?: number; status?: string } = {}) {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.status) searchParams.set('status', params.status)
    return this.get<CommissionItem[]>(`/commissions?${searchParams.toString()}`)
  }
}

export const commissionsService = new CommissionsService()
