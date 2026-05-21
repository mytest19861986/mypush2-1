import { BaseService } from './base.service'
import type { DiscountPlanItem, UserPlanItem } from '@/types'

interface PlanListParams {
  page?: number
  limit?: number
  status?: string
}

interface CreatePlanData {
  name: string
  description?: string
  price: number
  discountPercent: number
  durationDays: number
  maxUses: number
  status?: string
}

type UpdatePlanData = Partial<CreatePlanData>

export class PlansService extends BaseService {
  async getList(params: PlanListParams = {}) {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.status) searchParams.set('status', params.status)
    return this.get<DiscountPlanItem[]>(`/plans?${searchParams.toString()}`)
  }

  async getById(id: string) {
    return this.get<DiscountPlanItem>(`/plans/${id}`)
  }

  async create(data: CreatePlanData) {
    return this.post<DiscountPlanItem>('/plans', data)
  }

  async update(id: string, data: UpdatePlanData) {
    return this.patch<DiscountPlanItem>(`/plans/${id}`, data)
  }

  async delete(id: string) {
    return this.client.delete(`/plans/${id}`)
  }

  async getMyPlans() {
    return this.get<UserPlanItem[]>('/user-plans/my')
  }

  async purchasePlan(planId: string, referrerCode?: string) {
    return this.post<UserPlanItem>('/user-plans', { planId, referrerCode })
  }
}

export const plansService = new PlansService()
