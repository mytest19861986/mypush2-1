import { BaseService } from './base.service'
import type { ApiResponse } from '@/lib/api-client'
import type { ContractItem } from '@/types'

interface ContractListParams {
  page?: number
  limit?: number
  status?: string
}

interface CreateContractData {
  userPlanId: string
  diagnosis?: string
  doctorNote?: string
  totalAmount: number
  patientNote?: string
}

export class ContractsService extends BaseService {
  async getList(params: ContractListParams = {}) {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.status) searchParams.set('status', params.status)
    return this.get<ContractItem[]>(`/contracts?${searchParams.toString()}`)
  }

  async getMyContracts(params: ContractListParams = {}) {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.status) searchParams.set('status', params.status)
    const qs = searchParams.toString()
    return this.get<ContractItem[]>(`/contracts/my${qs ? `?${qs}` : ''}`)
  }

  async getDoctorContracts(params: ContractListParams = {}) {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.status) searchParams.set('status', params.status)
    const qs = searchParams.toString()
    const res = await this.get<ContractItem[] | { contracts: ContractItem[] }>(
      `/contracts/doctor${qs ? `?${qs}` : ''}`
    )
    if (res.success && res.data && !Array.isArray(res.data)) {
      const nested = res.data as { contracts?: ContractItem[] }
      return { ...res, data: nested.contracts ?? [] }
    }
    return res as ApiResponse<ContractItem[]>
  }

  async getById(id: string) {
    return this.get<ContractItem>(`/contracts/${id}`)
  }

  async create(data: CreateContractData) {
    return this.post<ContractItem>('/contracts', data)
  }
}

export const contractsService = new ContractsService()
