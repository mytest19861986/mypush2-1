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

interface PayCommissionData {
  refId?: string
  description?: string
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

  async getAll(params: { page?: number; limit?: number; status?: string } = {}) {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.status) searchParams.set('status', params.status)
    return this.get<CommissionItem[]>(`/commissions?${searchParams.toString()}`)
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
