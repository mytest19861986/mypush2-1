// CMD-HAMI-AGENT-DASHBOARD-07: explicit Model B policy boundary.
// Original prototype preserved in docs/financial-04/SettlementService.BASE.preserved.txt.
// No memory ledger, manufactured balance, reservation, or payout is performed.
export class DoctorSettlementPolicyError extends Error {
  readonly code = 'DOCTOR_SETTLEMENT_DISABLED_MODEL_B'
  constructor() { super('Doctor settlements are not enabled under Model B') }
}
export class DoctorFinancialSourceError extends Error {
  readonly code = 'DOCTOR_FINANCIAL_SOURCE_UNVERIFIED'
  constructor() { super('Doctor financial reporting source is not verified') }
}
export class SettlementService {
  static validateSheba(sheba: string): boolean { return /^IR\d{24}$/.test(sheba.replace(/\s+/g, '').toUpperCase()) }
  static async requestSettlement(...args: unknown[]): Promise<never> { void args; throw new DoctorSettlementPolicyError() }
  static async approveSettlement(...args: unknown[]): Promise<never> { void args; throw new DoctorSettlementPolicyError() }
  static async paySettlement(...args: unknown[]): Promise<never> { void args; throw new DoctorSettlementPolicyError() }
  static async rejectSettlement(...args: unknown[]): Promise<never> { void args; throw new DoctorSettlementPolicyError() }
  static getDoctorSettlements(...args: unknown[]): never { void args; throw new DoctorFinancialSourceError() }
  static getAllSettlementsForAdmin(): never { throw new DoctorFinancialSourceError() }
  static _resetMockRepo(): never { throw new DoctorSettlementPolicyError() }
}
