import { BaseService } from './base.service'
import type { UserItem, PaginationMeta } from '@/types'

interface UserListParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  role?: string
}

export class UsersService extends BaseService {
  async getList(params: UserListParams = {}) {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.search) searchParams.set('search', params.search)
    if (params.status) searchParams.set('status', params.status)
    if (params.role) searchParams.set('role', params.role)
    return this.get<UserItem[]>(`/users?${searchParams.toString()}`)
  }

  async getById(id: string) {
    return this.get<UserItem>(`/users/${id}`)
  }

  async changeStatus(id: string, status: string) {
    return this.patch(`/users/${id}/status`, { status })
  }

  async delete(id: string) {
    return this.client.delete(`/users/${id}`)
  }
}

export const usersService = new UsersService()
