import { BaseService } from './base.service'
import type { DoctorItem } from '@/types'

interface DoctorListParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  specialty?: string
}

interface DoctorRegisterData {
  medicalCode: string
  specialty: string
  clinicName: string
  clinicAddress?: string
  city?: string
  province?: string
  phone?: string
  bio?: string
}

interface DoctorUpdateData {
  specialty?: string
  clinicName?: string
  clinicAddress?: string
  city?: string
  province?: string
  phone?: string
  bio?: string
}

export class DoctorsService extends BaseService {
  async getList(params: DoctorListParams = {}) {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.search) searchParams.set('search', params.search)
    if (params.status) searchParams.set('status', params.status)
    if (params.specialty) searchParams.set('specialty', params.specialty)
    return this.get<DoctorItem[]>(`/doctors?${searchParams.toString()}`)
  }

  async getById(id: string) {
    return this.get<DoctorItem>(`/doctors/${id}`)
  }

  async getMyProfile() {
    return this.get<DoctorItem>('/doctors/my')
  }

  async updateMyProfile(data: DoctorUpdateData) {
    return this.put('/doctors/my', data)
  }

  async register(data: DoctorRegisterData) {
    return this.post('/doctor/register', data)
  }

  async changeStatus(id: string, status: string) {
    return this.patch(`/doctors/${id}/status`, { status })
  }

  async updateByAdmin(id: string, data: { discountPercent: number }) {
    return this.patch<DoctorItem>(`/doctors/${id}`, data)
  }
}

export const doctorsService = new DoctorsService()
