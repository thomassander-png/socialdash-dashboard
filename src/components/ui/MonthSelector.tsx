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
    <div className="relative">
      <select
        value={currentMonth}
        onChange={handleChange}
        className="appearance-none bg-[#141414] text-white pl-4 pr-10 py-3 rounded-xl border border-[rgba(255,255,255,0.1)] focus:outline-none focus:ring-2 focus:ring-[#84CC16]/50 focus:border-[#84CC16] transition-all cursor-pointer hover:border-[rgba(255,255,255,0.2)] font-medium"
      >
        {months.map((month) => (
          <option key={month} value={month} className="bg-[#141414]">
            {formatMonth(month)}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
