'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PaymentCallback() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('در حال بررسی پرداخت...');
  const [refId, setRefId] = useState<string | null>(null);

  useEffect(() => {
    const authority = searchParams?.get('Authority');
    const status = searchParams?.get('Status');

    if (!authority) {
      setMessage('پارامتر Authority موجود نیست.');
      return;
    }

    async function verifyPayment() {
      try {
        const amount = 0; // در صورت نیاز مقدار واقعی را تنظیم کنید

        const response = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            authority,
            amount,
          }),
        });

        const data = await response.json();

        if (data.status === 100) {
          setMessage('پرداخت با موفقیت انجام شد.');
          setRefId(data.refId);
        } else {
          setMessage('پرداخت ناموفق بود یا تایید نشد.');
        }
      } catch (error) {
        console.error(error);
        setMessage('خطا در ارتباط با سرویس پرداخت.');
      }
    }

    if (status === 'OK') {
      verifyPayment();
    } else {
      setMessage('پرداخت لغو شد یا ناموفق بود.');
    }
  }, [searchParams]);

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1>نتیجه پرداخت</h1>
      <p>{message}</p>
      {refId && <p>کد پیگیری: {refId}</p>}
    </div>
  );
}