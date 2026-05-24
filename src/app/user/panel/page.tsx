'use client';

import { useEffect } from 'react';

export default function UserPanel() {
  useEffect(() => {
    console.log('مونت شد');
  }, []);

  const testClick = () => {
    alert('تست کلیک');
    console.log('کلیک شد');
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1>پنل کاربری</h1>
      <button onClick={testClick} className="bg-blue-600 text-white px-4 py-2 rounded">
        دکمه تست کلیک
      </button>
      <br />
      <br />
      <a
        href="/api/payment/request?Amount=10000&CallbackURL=http://localhost:3000/payment/callback"
        className="text-blue-500 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        پرداخت مستقیم (لینک GET)
      </a>
    </div>
  );
}