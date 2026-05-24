'use client';
import { useEffect } from 'react';

export default function TestButton() {
  useEffect(() => {
    console.log('✅ صفحه تست بارگذاری شد');
    alert('صفحه تست باز شد');
  }, []);

  const handleClick = () => {
    alert('دکمه کلیک شد!');
    console.log('کلیک شد');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <button onClick={handleClick} style={{ fontSize: '2rem', padding: '1rem' }}>
        کلیک کن
      </button>
    </div>
  );
}