'use server';

import { NextResponse } from 'next/server';

const MERCHANT_ID = 'eaa46b01-819e-42ef-8a67-ba2bb7f69a32';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { authority, amount } = await request.json();

    const response = await fetch('https://sandbox.zarinpal.com/pg/rest/WebGate/PaymentVerification.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        MerchantID: MERCHANT_ID,
        Authority: authority,
        Amount: amount,
      }),
    });

    const data = await response.json();

    if (data.Status === 100) {
      return NextResponse.json({
        refId: data.RefID,
        status: data.Status,
      });
    } else {
      return NextResponse.json({ error: 'Payment verification failed', status: data.Status }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in payment verify API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}