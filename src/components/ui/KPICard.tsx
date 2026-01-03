interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: string;
}

export default function KPICard({ title, value, subtitle, icon }: KPICardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{title}</span>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
      {subtitle && <div className="text-gray-500 text-sm mt-1">{subtitle}</div>}
    </div>
  );
}
