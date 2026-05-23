'use client'

import React, { useState, useEffect } from 'react';

interface Transaction {
  id: number;
  date: string;
  amount: number;
  description: string;
  status: string;
  serviceCategory?: string;
  type?: 'input' | 'payment';
  userId?: string;
}

export default function TransactionsManagement() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // New states for filters
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterServiceCategory, setFilterServiceCategory] = useState<string>('');

  useEffect(() => {
    // Simulate fetching transactions data
    setTimeout(() => {
      try {
        const data: Transaction[] = [
          { id: 1, date: '2026-05-20', amount: 100000, description: 'پرداخت قبض', status: 'موفق', serviceCategory: 'خدمات A', type: 'input', userId: 'user1' },
          { id: 2, date: '2026-05-21', amount: 250000, description: 'خرید اینترنتی', status: 'ناموفق', serviceCategory: 'خدمات B', type: 'input', userId: 'user2' },
          { id: 3, date: '2026-05-22', amount: 50000, description: 'واریز وجه', status: 'موفق', serviceCategory: 'خدمات A', type: 'payment', userId: 'user1' },
          { id: 4, date: '2026-04-15', amount: 75000, description: 'پرداخت قبوض', status: 'موفق', serviceCategory: 'خدمات C', type: 'input', userId: 'user3' },
          { id: 5, date: '2026-04-20', amount: 120000, description: 'بازپرداخت', status: 'موفق', serviceCategory: 'خدمات B', type: 'payment', userId: 'user2' },
        ];
        setTransactions(data);
        setLoading(false);
      } catch (e) {
        setError('خطا در بارگذاری تراکنش‌ها');
        setLoading(false);
      }
    }, 1000);
  }, []);

  if (loading) return <div className="p-6">در حال بارگذاری تراکنش‌ها...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  // Filter transactions by status, month, year, and service category
  const filteredTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;

    // Convert txDate to Jalali year and month for filtering
    const jalaliDateParts = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(txDate);

    let jalaliYear = '';
    let jalaliMonth = '';
    for (const part of jalaliDateParts) {
      if (part.type === 'year') jalaliYear = part.value;
      if (part.type === 'month') jalaliMonth = part.value;
    }

    const matchesMonth = !filterMonth || jalaliMonth === filterMonth.padStart(2, '0');
    const matchesYear = !filterYear || jalaliYear === filterYear;
    const matchesService = !filterServiceCategory || tx.serviceCategory === filterServiceCategory;
    return matchesStatus && matchesMonth && matchesYear && matchesService;
  });

  // Extract unique service categories for filter dropdown
  const serviceCategories = Array.from(new Set(transactions.map(tx => tx.serviceCategory).filter(Boolean)));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">مدیریت تراکنش‌ها</h1>
      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <label htmlFor="statusFilter" className="mr-2 font-semibold">فیلتر وضعیت:</label>
          <select
            id="statusFilter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">همه</option>
            <option value="موفق">موفق</option>
            <option value="ناموفق">ناموفق</option>
          </select>
        </div>
        <div>
          <label htmlFor="yearFilter" className="mr-2 font-semibold">سال:</label>
          <select
            id="yearFilter"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 w-24"
          >
            <option value="">همه</option>
            <option value="1405">1405</option>
            <option value="1404">1404</option>
            <option value="1403">1403</option>
            <option value="1402">1402</option>
            <option value="1401">1401</option>
            <option value="1400">1400</option>
          </select>
        </div>
        <div>
          <label htmlFor="monthFilter" className="mr-2 font-semibold">ماه:</label>
          <select
            id="monthFilter"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 w-24"
          >
            <option value="">همه</option>
            <option value="1">فروردین</option>
            <option value="2">اردیبهشت</option>
            <option value="3">خرداد</option>
            <option value="4">تیر</option>
            <option value="5">مرداد</option>
            <option value="6">شهریور</option>
            <option value="7">مهر</option>
            <option value="8">آبان</option>
            <option value="9">آذر</option>
            <option value="10">دی</option>
            <option value="11">بهمن</option>
            <option value="12">اسفند</option>
          </select>
        </div>
        <div>
          <label htmlFor="serviceFilter" className="mr-2 font-semibold">دسته بندی خدمات:</label>
          <select
            id="serviceFilter"
            value={filterServiceCategory}
            onChange={(e) => setFilterServiceCategory(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value="">همه</option>
            {serviceCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>
      <table className="min-w-full border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-4 py-2">شناسه</th>
            <th className="border border-gray-300 px-4 py-2">تاریخ</th>
            <th className="border border-gray-300 px-4 py-2">مبلغ (تومان)</th>
            <th className="border border-gray-300 px-4 py-2">توضیحات</th>
            <th className="border border-gray-300 px-4 py-2">وضعیت</th>
            <th className="border border-gray-300 px-4 py-2">دسته بندی خدمات</th>
            <th className="border border-gray-300 px-4 py-2">نوع تراکنش</th>
            <th className="border border-gray-300 px-4 py-2">شناسه کاربر</th>
          </tr>
        </thead>
        <tbody>
          {filteredTransactions.map((tx) => {
            // Convert Gregorian date to Jalali (Persian) date string
            const gregorianDate = new Date(tx.date);
            // Simple conversion function for demonstration (replace with a proper library if needed)
            function toJalali(gDate: Date): string {
              // Using Intl.DateTimeFormat with 'fa-IR' locale to format Persian date
              return new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              }).format(gDate);
            }
            const jalaliDate = toJalali(gregorianDate);
            return (
              <tr key={tx.id} className="text-center">
                <td className="border border-gray-300 px-4 py-2">{tx.id}</td>
                <td className="border border-gray-300 px-4 py-2">{jalaliDate}</td>
                <td className="border border-gray-300 px-4 py-2">{tx.amount.toLocaleString()}</td>
                <td className="border border-gray-300 px-4 py-2">{tx.description}</td>
                <td className={`border border-gray-300 px-4 py-2 ${tx.status === 'موفق' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.status}
                </td>
                <td className="border border-gray-300 px-4 py-2">{tx.serviceCategory}</td>
                <td className="border border-gray-300 px-4 py-2">{tx.type}</td>
                <td className="border border-gray-300 px-4 py-2">{tx.userId}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
