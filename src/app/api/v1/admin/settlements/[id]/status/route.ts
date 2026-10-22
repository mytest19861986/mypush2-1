import { NextRequest, NextResponse } from 'next/server';
import { SettlementService } from '@/lib/services/financial/SettlementService';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actorRole = req.headers.get('x-user-role');
    const actorUserId = req.headers.get('x-user-id') || 'admin_user';

    if (actorRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access Denied: Only Super Admin can approve/reject settlements.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, reason } = body; // action: 'APPROVE' | 'REJECT'

    if (action === 'APPROVE') {
      const updated = await SettlementService.approveSettlement(id, actorUserId);
      return NextResponse.json({ success: true, settlement: updated });
    } else if (action === 'PAY') {
      const { bankTrackingNumber } = body;
      const updated = await SettlementService.paySettlement(id, actorUserId, bankTrackingNumber);
      return NextResponse.json({ success: true, settlement: updated });
    } else if (action === 'REJECT') {
      const updated = await SettlementService.rejectSettlement(id, actorUserId, reason || 'Rejected by Admin');
      return NextResponse.json({ success: true, settlement: updated });
    }

    return NextResponse.json({ error: 'Invalid action. Must be APPROVE, PAY, or REJECT' }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
