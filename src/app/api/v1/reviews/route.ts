import { NextRequest, NextResponse } from 'next/server';
import { reviewDomainService } from '@/lib/services/review-domain-service';
import { isSocialProofEnabled } from '@/lib/config/social-proof';

export async function POST(request: NextRequest) {
  try {
    if (!isSocialProofEnabled()) {
      return NextResponse.json(
        { success: false, error: 'ماژول نظرات در حال حاضر غیرفعال است.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { doctorId, encounterId, rating, comment } = body;

    // Simulate authenticated patient context
    const patientId = 'patient-session-user';

    const result = await reviewDomainService.submitReview(
      { doctorId, encounterId, rating, comment },
      patientId
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          reviewId: result.reviewId,
          status: 'PENDING',
          message: 'نظر شما ثبت شد و پس از بررسی ادمین منتشر خواهد شد.',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json(
      { success: false, error: 'درخواست نامعتبر است.' },
      { status: 400 }
    );
  }
}
