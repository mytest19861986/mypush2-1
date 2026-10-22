import { 
  SettlementRequest, 
  CreateSettlementRequestDTO, 
  SettlementStatus 
} from '../../../types/financial';
import { FinancialLedgerService } from './FinancialLedgerService';

class SettlementRepository {
  private requests: SettlementRequest[] = [];

  public add(req: SettlementRequest): void {
    this.requests.push({ ...req });
  }

  public getById(id: string): SettlementRequest | undefined {
    return this.requests.find(r => r.id === id);
  }

  public getByDoctorId(doctorId: string): SettlementRequest[] {
    return this.requests.filter(r => r.doctorId === doctorId);
  }

  public getAll(): SettlementRequest[] {
    return [...this.requests];
  }

  public update(req: SettlementRequest): void {
    const idx = this.requests.findIndex(r => r.id === req.id);
    if (idx !== -1) {
      this.requests[idx] = { ...req };
    }
  }

  public clear(): void {
    this.requests = [];
  }
}

const settlementRepo = new SettlementRepository();

export class SettlementService {
  private static readonly MIN_SETTLEMENT_AMOUNT_IRR = 1_000_000; // 1,000,000 Rial (~100k Toman)

  /**
   * Validate Sheba formatting (Iran IBAN starts with IR followed by 24 digits).
   */
  public static validateSheba(sheba: string): boolean {
    const clean = sheba.replace(/\s+/g, '').toUpperCase();
    return /^IR\d{24}$/.test(clean);
  }

  /**
   * Request a new settlement payout.
   */
  public static async requestSettlement(dto: CreateSettlementRequestDTO): Promise<SettlementRequest> {
    if (!this.validateSheba(dto.shebaNumber)) {
      throw new Error('Invalid Sheba (IBAN) format. Must start with IR followed by 24 digits.');
    }

    if (dto.amountIrr < this.MIN_SETTLEMENT_AMOUNT_IRR) {
      throw new Error(`Minimum settlement amount is ${this.MIN_SETTLEMENT_AMOUNT_IRR.toLocaleString()} IRR.`);
    }

    // Check if doctor has existing active pending request
    const existing = settlementRepo.getByDoctorId(dto.doctorId);
    const hasPending = existing.some(r => r.status === 'PENDING_REVIEW' || r.status === 'PROCESSING');
    if (hasPending) {
      throw new Error('Doctor already has a settlement request pending review.');
    }

    // Verify balance & create ledger hold
    const balance = await FinancialLedgerService.getDoctorBalance(dto.doctorId);
    if (balance.availableBalanceIrr < dto.amountIrr) {
      throw new Error(`Insufficient available balance (${balance.availableBalanceIrr} IRR) for requested settlement (${dto.amountIrr} IRR).`);
    }

    const requestId = `settle_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Ledger hold
    await FinancialLedgerService.recordEntry({
      idempotencyKey: `hold_${requestId}`,
      doctorId: dto.doctorId,
      transactionType: 'SETTLEMENT_HOLD',
      amountIrr: dto.amountIrr,
      entryDirection: 'DEBIT',
      sourceRefType: 'SETTLEMENT_REQUEST',
      sourceRefId: requestId,
      description: `Settlement Hold for request #${requestId}`,
      actorUserId: dto.actorDoctorUserId,
    });

    const request: SettlementRequest = {
      id: requestId,
      doctorId: dto.doctorId,
      amountIrr: dto.amountIrr,
      shebaNumber: dto.shebaNumber,
      accountHolderName: dto.accountHolderName,
      status: 'PENDING_REVIEW',
      requestedAt: new Date().toISOString(),
    };

    settlementRepo.add(request);
    return request;
  }

  /**
   * Admin approves settlement request (moves to APPROVED, hold remains active).
   */
  public static async approveSettlement(requestId: string, adminUserId: string): Promise<SettlementRequest> {
    const request = settlementRepo.getById(requestId);
    if (!request) {
      throw new Error(`Settlement request ${requestId} not found.`);
    }

    if (request.status !== 'PENDING_REVIEW') {
      throw new Error(`Cannot approve settlement in status: ${request.status}`);
    }

    request.status = 'APPROVED';
    request.processedAt = new Date().toISOString();
    request.processedByAdminId = adminUserId;

    settlementRepo.update(request);
    return request;
  }

  /**
   * Admin/System records external payout completion (moves APPROVED to SETTLED).
   */
  public static async paySettlement(
    requestId: string,
    adminUserId: string,
    bankTrackingNumber?: string
  ): Promise<SettlementRequest> {
    const request = settlementRepo.getById(requestId);
    if (!request) {
      throw new Error(`Settlement request ${requestId} not found.`);
    }

    if (request.status !== 'APPROVED') {
      throw new Error(`فقط درخواست‌های تسویه تاییدشده قابل پرداخت هستند. وضعیت فعلی: ${request.status}`);
    }

    const tracking = bankTrackingNumber?.trim() || `TRACK_${Date.now()}_MOCK`;

    // Ledger payout entry (clearing hold into settled debit)
    await FinancialLedgerService.recordEntry({
      idempotencyKey: `payout_${requestId}`,
      doctorId: request.doctorId,
      transactionType: 'SETTLEMENT_PAYOUT',
      amountIrr: request.amountIrr,
      entryDirection: 'DEBIT',
      sourceRefType: 'SETTLEMENT_REQUEST',
      sourceRefId: requestId,
      description: `Settlement Payout completed via ref ${tracking}`,
      actorUserId: adminUserId,
    });

    request.status = 'SETTLED';
    request.processedAt = new Date().toISOString();
    request.processedByAdminId = adminUserId;
    request.bankTrackingNumber = tracking;

    settlementRepo.update(request);
    return request;
  }


  /**
   * Admin rejects settlement and returns hold balance.
   */
  public static async rejectSettlement(requestId: string, adminUserId: string, reason: string): Promise<SettlementRequest> {
    const request = settlementRepo.getById(requestId);
    if (!request) {
      throw new Error(`Settlement request ${requestId} not found.`);
    }

    if (request.status !== 'PENDING_REVIEW') {
      throw new Error(`Cannot reject settlement in status: ${request.status}`);
    }

    // Ledger unlock refund
    await FinancialLedgerService.recordEntry({
      idempotencyKey: `reject_refund_${requestId}`,
      doctorId: request.doctorId,
      transactionType: 'SETTLEMENT_REJECT',
      amountIrr: request.amountIrr,
      entryDirection: 'CREDIT',
      sourceRefType: 'SETTLEMENT_REQUEST',
      sourceRefId: requestId,
      description: `Settlement Hold Refund: ${reason}`,
      actorUserId: adminUserId,
    });

    request.status = 'REJECTED';
    request.processedAt = new Date().toISOString();
    request.processedByAdminId = adminUserId;
    request.rejectionReason = reason;

    settlementRepo.update(request);
    return request;
  }

  public static getDoctorSettlements(doctorId: string): SettlementRequest[] {
    return settlementRepo.getByDoctorId(doctorId);
  }

  public static getAllSettlementsForAdmin(): SettlementRequest[] {
    return settlementRepo.getAll();
  }

  public static _resetMockRepo(): void {
    settlementRepo.clear();
  }
}
