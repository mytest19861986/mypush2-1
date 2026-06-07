import { BaseService } from './base.service'
import type { DashboardStats } from '@/types'

export class DashboardService extends BaseService {
  async getStats() {
    return this.get<DashboardStats>('/dashboard/stats')
  }
}

export const dashboardService = new DashboardService()
