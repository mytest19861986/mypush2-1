import { BaseService } from './base.service'
import type { UserItem } from '@/types'

interface UserListParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  role?: string
}

interface UserProfileUpdateData {
  firstName?: string
  lastName?: string
  nationalCode?: string
  address?: string
  gender?: 'MALE' | 'FEMALE'
  avatar?: string | null
}

interface UploadResult {
  id: string
  path: string
  type: string
  size: number
  mimeType: string
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

  async updateProfile(data: UserProfileUpdateData) {
    return this.put('/users/profile', data)
  }

  async uploadAvatar(file: File, onProgress?: (progress: number) => void) {
    const formData = new FormData()
    formData.append('type', 'AVATAR')
    formData.append('file', file)
    return this.upload<UploadResult>('/uploads', formData, onProgress)
  }

  async delete<T = unknown>(id: string): Promise<T> {
    return this.client.delete<T>(`/users/${id}`)
  }
}

export const usersService = new UsersService()
