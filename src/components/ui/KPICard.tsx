interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: string;
  highlight?: boolean;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export default function KPICard({ title, value, subtitle, icon, highlight, trend, trendValue }: KPICardProps) {
  return (
    <div className={`kpi-card group transition-all duration-300 hover:scale-[1.02] ${
      highlight 
        ? 'bg-gradient-to-br from-[#84CC16]/20 to-[#84CC16]/5 border-[#84CC16]/30' 
        : ''
    }`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-400 text-sm font-medium">{title}</span>
        {icon && (
          <span className="text-2xl opacity-70 group-hover:opacity-100 transition-opacity">
            {icon}
          </span>
        )}
      </div>
      <div className={`text-4xl font-bold tracking-tight ${
        highlight ? 'gradient-text' : 'text-white'
      }`}>
        {value}
      </div>
      {(subtitle || trendValue) && (
        <div className="flex items-center gap-2 mt-3">
          {trendValue && (
            <span className={`text-sm font-medium flex items-center gap-1 ${
              trend === 'up' ? 'text-green-400' : 
              trend === 'down' ? 'text-red-400' : 
              'text-gray-400'
            }`}>
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
              {trendValue}
            </span>
          )}
          {subtitle && <span className="text-gray-500 text-sm">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
