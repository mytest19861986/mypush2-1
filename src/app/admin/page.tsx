
import React from 'react';
import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">پنل مدیریت</h1>
      <nav>
        <ul className="list-disc list-inside">
          <li>
            <Link href="/admin/financial-management">
              <a className="text-blue-600 hover:underline">مدیریت مالی</a>
            </Link>
          </li>
          <li>
            <Link href="/admin/users">
              <a className="text-blue-600 hover:underline">مدیریت کاربران</a>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
