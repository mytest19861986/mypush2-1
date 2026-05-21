import { BaseService } from './base.service'
import type { PatientLookupResult } from '@/types'

export class PatientsService extends BaseService {
  async lookupByNationalCode(nationalCode: string) {
    return this.get<PatientLookupResult>(`/patients/lookup?nationalCode=${nationalCode}`)
  }
}

export const patientsService = new PatientsService()
