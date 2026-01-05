interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: string;
  highlight?: boolean;
}

export default function KPICard({ title, value, subtitle, icon, highlight }: KPICardProps) {
  return (
    <div className={`rounded-xl p-6 border transition-all ${
      highlight 
        ? 'bg-[#c8ff00]/10 border-[#c8ff00]/30' 
        : 'bg-[#111] border-[#222] hover:border-[#333]'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{title}</span>
        {icon && <span className="text-xl opacity-60">{icon}</span>}
      </div>
      <div className={`text-3xl font-bold ${highlight ? 'text-[#c8ff00]' : 'text-white'}`}>
        {value}
      </div>
      {subtitle && <div className="text-gray-500 text-sm mt-1">{subtitle}</div>}
    </div>
  );
}
