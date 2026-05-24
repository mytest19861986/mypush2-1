import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[1] Body received:', body);

    const { amount, callbackUrl, description, merchantId } = body;
    if (!amount || !callbackUrl) {
      return NextResponse.json({ success: false, message: 'amount or callbackUrl missing' }, { status: 400 });
    }

    // Use provided merchantId or fallback to default UUID for sandbox
    const MERCHANT_ID = merchantId || 'eaa46b01-819e-42ef-8a67-ba2bb7f69a32';

    const zarinpalPayload = {
      MerchantID: MERCHANT_ID,
      Amount: amount,
      CallbackURL: callbackUrl,
      Description: description || 'خرید طرح',
    };
    console.log('[2] Sending to Zarinpal:', zarinpalPayload);

    const response = await fetch('https://sandbox.zarinpal.com/pg/v4/payment/request.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(zarinpalPayload),
    });

    console.log('[3] Zarinpal response status:', response.status);
    const responseText = await response.text();
    console.log('[4] Raw response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[5] JSON parse error:', e);
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid JSON from Zarinpal', 
        rawResponse: responseText 
      }, { status: 502 });
    }

    if (data.Status === 100) {
      const paymentUrl = `https://sandbox.zarinpal.com/pg/StartPay/${data.Authority}`;
      return NextResponse.json({
        success: true,
        authority: data.Authority,
        paymentUrl: paymentUrl,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `Zarinpal error: Status ${data.Status}`,
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[FATAL]', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}