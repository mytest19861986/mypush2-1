import { BaseService } from './base.service'
import type { AuditLogItem, DashboardStats } from '@/types'

interface AuditLogParams {
  page?: number
  limit?: number
  action?: string
  entity?: string
  userId?: string
  startDate?: string
  endDate?: string
}

export class AuditService extends BaseService {
  async getLogs(params: AuditLogParams = {}) {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.action) searchParams.set('action', params.action)
    if (params.entity) searchParams.set('entity', params.entity)
    if (params.userId) searchParams.set('userId', params.userId)
    if (params.startDate) searchParams.set('startDate', params.startDate)
    if (params.endDate) searchParams.set('endDate', params.endDate)
    return this.get<AuditLogItem[]>(`/audit-logs?${searchParams.toString()}`)
  }

  async getStats() {
    return this.get<DashboardStats>('/audit-logs/stats')
  }
}

export const auditService = new AuditService()
