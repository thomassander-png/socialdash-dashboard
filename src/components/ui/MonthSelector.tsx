'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { getAvailableMonths } from '@/lib/utils';

export default function MonthSelector({ currentMonth }: { currentMonth: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const months = getAvailableMonths();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', e.target.value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  };

  return (
    <select
      value={currentMonth}
      onChange={handleChange}
      className="bg-[#111] text-white px-4 py-2 rounded-lg border border-[#333] focus:outline-none focus:ring-2 focus:ring-[#c8ff00] focus:border-[#c8ff00]"
    >
      {months.map((month) => (
        <option key={month} value={month}>
          {formatMonth(month)}
        </option>
      ))}
    </select>
  );
}
