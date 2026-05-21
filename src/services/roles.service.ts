import { BaseService } from './base.service'
import type { RoleItem, PermissionItem } from '@/types'

export class RolesService extends BaseService {
  async getList() {
    return this.get<RoleItem[]>('/roles')
  }

  async getById(id: string) {
    return this.get<RoleItem>(`/roles/${id}`)
  }

  async create(data: { name: string; title: string; description?: string }) {
    return this.post<RoleItem>('/roles', data)
  }

  async updatePermissions(id: string, permissionIds: string[]) {
    return this.patch(`/roles/${id}/permissions`, { permissionIds })
  }
}

export const rolesService = new RolesService()
