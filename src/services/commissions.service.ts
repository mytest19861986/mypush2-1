import { BaseService } from './base.service'
import type { CommissionItem } from '@/types'

export class CommissionsService extends BaseService {
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
