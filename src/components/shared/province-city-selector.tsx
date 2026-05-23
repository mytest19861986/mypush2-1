import { useState } from 'react';

const provinces = [
  { name: 'تهران', cities: ['تهران', 'ری', 'شمیرانات'] },
  { name: 'اصفهان', cities: ['اصفهان', 'کاشان', 'خمینی‌شهر'] },
  { name: 'فارس', cities: ['شیراز', 'مرودشت', 'کازرون'] },
  // ... سایر استان‌ها
];

export default function ProvinceCitySelector({ onChange }) {
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');

  const selected = provinces.find((p) => p.name === province);

  return (
    <div className="flex gap-2">
      <select
        value={province}
        onChange={e => {
          setProvince(e.target.value);
          setCity('');
          onChange && onChange({ province: e.target.value, city: '' });
        }}
        className="border rounded px-2 py-1"
      >
        <option value="">انتخاب استان</option>
        {provinces.map(p => (
          <option key={p.name} value={p.name}>{p.name}</option>
        ))}
      </select>
      <select
        value={city}
        onChange={e => {
          setCity(e.target.value);
          onChange && onChange({ province, city: e.target.value });
        }}
        disabled={!province}
        className="border rounded px-2 py-1"
      >
        <option value="">انتخاب شهر</option>
        {selected?.cities.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}
