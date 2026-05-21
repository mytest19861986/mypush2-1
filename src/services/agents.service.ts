import { BaseService } from './base.service'
import type { AgentItem, AgentDocumentItem } from '@/types'

interface AgentListParams {
  page?: number
  limit?: number
  search?: string
  status?: string
}

export class AgentsService extends BaseService {
  async getList(params: AgentListParams = {}) {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.search) searchParams.set('search', params.search)
    if (params.status) searchParams.set('status', params.status)
    return this.get<AgentItem[]>(`/agents?${searchParams.toString()}`)
  }

  async getById(id: string) {
    return this.get<AgentItem>(`/agents/${id}`)
  }

  async getMyProfile() {
    return this.get<AgentItem>('/agents/my')
  }

  async updateMyProfile(data: { businessName?: string; description?: string }) {
    return this.put('/agents/my', data)
  }

  async register(data?: { businessName?: string; description?: string }) {
    return this.post('/agents/register', data)
  }

  async changeStatus(id: string, status: string) {
    return this.patch(`/agents/${id}/status`, { status })
  }

  async getDocuments() {
    return this.get<AgentDocumentItem[]>('/agents/documents')
  }

  async uploadDocument(type: string, file: File, onProgress?: (progress: number) => void) {
    const formData = new FormData()
    formData.append('type', type)
    formData.append('file', file)
    return this.upload('/agents/documents', formData, onProgress)
  }

  async reviewDocument(id: string, status: string) {
    return this.patch(`/agents/documents/${id}/review`, { status })
  }
}

export const agentsService = new AgentsService()
