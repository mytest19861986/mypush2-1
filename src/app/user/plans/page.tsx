'use client';

import { useState } from 'react';

type Plan = {
  id: string;
  name: string;
  price: number;
  description: string;
};

type PlanCardProps = {
  plan: Plan;
  onPurchase: (amount: number, description: string) => void;
};

function PlanCard({ plan, onPurchase }: PlanCardProps) {
  return (
    <div className="border p-4 rounded shadow mb-4">
      <h2 className="text-xl font-bold">{plan.name}</h2>
      <p>{plan.description}</p>
      <p className="font-semibold">قیمت: {plan.price.toLocaleString()} تومان</p>
      <button
        onClick={() => onPurchase(plan.price, plan.name)}
        className="mt-2 bg-green-600 text-white px-4 py-2 rounded"
      >
        خرید طرح
      </button>
    </div>
  );
}

export default function PlansPage() {
  const [loading, setLoading] = useState(false);
  const [merchantId, setMerchantId] = useState('');

  const handlePurchase = async (amount: number, description: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/payment/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description,
          callbackUrl: `${window.location.origin}/payment/callback`,
          merchantId: merchantId || undefined,
        }),
      });

      const data = await response.json();

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        alert('خطا: لینک پرداخت دریافت نشد.');
        console.error('Payment URL missing in response:', data);
      }
    } catch (error) {
      console.error('خطا در درخواست پرداخت:', error);
      alert('مشکل در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  const plans: Plan[] = [
    { id: '1', name: 'طرح پایه', price: 10000, description: 'طرح پایه با امکانات محدود' },
    { id: '2', name: 'طرح پیشرفته', price: 25000, description: 'طرح پیشرفته با امکانات بیشتر' },
  ];

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">طرح‌های من</h1>
      <div className="mb-4">
        <label className="block mb-1 font-semibold">مرچنت آیدی (برای تست سندباکس، یک UUID دلخواه وارد کنید):</label>
        <input
          type="text"
          value={merchantId}
          onChange={e => setMerchantId(e.target.value)}
          placeholder="مثلاً: 123e4567-e89b-12d3-a456-426614174000"
          className="w-full border rounded px-2 py-1"
        />
      </div>
      {plans.map((plan) => (
        <PlanCard key={plan.id} plan={plan} onPurchase={handlePurchase} />
      ))}
      {loading && <p>در حال اتصال به درگاه پرداخت...</p>}
    </div>
  );
}
