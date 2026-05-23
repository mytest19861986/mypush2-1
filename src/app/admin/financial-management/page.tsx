import React from 'react';
import Link from 'next/link';

export default function FinancialManagementPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">مدیریت مالی</h1>
      <nav>
        <ul className="list-disc list-inside">
          <li>
            <Link href="/admin/financial-management/transactions" className="text-blue-600 hover:underline">
              مدیریت تراکنش‌ها
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
