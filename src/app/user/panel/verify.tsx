import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function VerifyPayment() {
  const router = useRouter();
  const { Authority, Status } = router.query;
  const [message, setMessage] = useState('در حال بررسی پرداخت...');

  useEffect(() => {
    if (!Authority) return;

    async function verify() {
      try {
        // Retrieve planId from query to get the amount for verification
        const urlParams = new URLSearchParams(window.location.search);
        const planId = urlParams.get('planId');

        // Fetch plan details from backend or local plans array
        let amount = 0;
        if (planId) {
          // Fetch plan details from backend API
          const res = await fetch(`/api/v1/plans/${planId}`);
          if (res.ok) {
            const plan = await res.json();
            amount = plan.price || 0;
          }
        }

        const response = await fetch('https://sandbox.zarinpal.com/pg/rest/WebGate/PaymentVerification.json', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            MerchantID: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
            Authority: Authority,
            Amount: amount,
          }),
        });

        const data = await response.json();

        if (data.Status === 100) {
          // TODO: Add the purchased plan to the user's account here
          setMessage('پرداخت با موفقیت انجام شد و طرح به حساب شما اضافه گردید.');
        } else {
          setMessage('پرداخت ناموفق بود یا تایید نشد.');
        }
      } catch (error) {
        console.error(error);
        setMessage('خطا در ارتباط با سرویس پرداخت.');
      }
    }

    verify();
  }, [Authority]);

  return (
    <div>
      <h1>تایید پرداخت</h1>
      <p>{message}</p>
    </div>
  );
}