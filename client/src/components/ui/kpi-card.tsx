import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

// German number formatting
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat("de-DE").format(num);
};

const formatPercent = (num: number): string => {
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(1)}%`;
};

// Sparkline component
interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

function Sparkline({ data, color = "#22c55e", height = 40 }: SparklineProps) {
  const chartData = data.map((value, index) => ({ value, index }));

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`sparklineGradient-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="index" hide />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#sparklineGradient-${color.replace("#", "")})`}
            isAnimationActive={true}
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Trend indicator component
interface TrendIndicatorProps {
  value: number;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

function TrendIndicator({ value, showIcon = true, size = "md" }: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-2.5 py-1.5",
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  if (isNeutral) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
        sizeClasses[size]
      )}>
        {showIcon && <Minus size={iconSizes[size]} />}
        <span>0%</span>
      </span>
    );
  }

  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full font-medium transition-all duration-200",
      isPositive
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      sizeClasses[size]
    )}>
      {showIcon && (isPositive ? (
        <TrendingUp size={iconSizes[size]} />
      ) : (
        <TrendingDown size={iconSizes[size]} />
      ))}
      <span>{formatPercent(value)}</span>
    </span>
  );
}

// Main KPI Card component
interface KpiCardProps {
  title: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  sparklineData?: number[];
  sparklineColor?: string;
  icon?: React.ReactNode;
  subtitle?: string;
  className?: string;
  variant?: "default" | "gradient" | "outline";
  size?: "sm" | "md" | "lg";
}

function KpiCard({
  title,
  value,
  change,
  changeLabel = "vs. Vormonat",
  sparklineData,
  sparklineColor,
  icon,
  subtitle,
  className,
  variant = "default",
  size = "md",
}: KpiCardProps) {
  const displayValue = typeof value === "number" ? formatNumber(value) : value;

  const variantClasses = {
    default: "bg-card border border-border",
    gradient: "bg-gradient-to-br from-card to-muted border border-border",
    outline: "bg-transparent border-2 border-border",
  };

  const sizeClasses = {
    sm: "p-4",
    md: "p-5",
    lg: "p-6",
  };

  const valueSizes = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-4xl",
  };

  // Determine sparkline color based on change
  const effectiveSparklineColor = sparklineColor || (change && change >= 0 ? "#22c55e" : "#ef4444");

  return (
    <div
      className={cn(
        "rounded-xl shadow-sm hover:shadow-md transition-all duration-300",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </div>
        {change !== undefined && (
          <TrendIndicator value={change} size="sm" />
        )}
      </div>

      {/* Value */}
      <div className="mb-2">
        <span className={cn(
          "font-bold tracking-tight text-foreground",
          valueSizes[size]
        )}>
          {displayValue}
        </span>
      </div>

      {/* Subtitle / Change Label */}
      {(subtitle || (change !== undefined && changeLabel)) && (
        <div className="text-xs text-muted-foreground mb-3">
          {subtitle || changeLabel}
        </div>
      )}

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-2">
          <Sparkline
            data={sparklineData}
            color={effectiveSparklineColor}
            height={size === "lg" ? 50 : size === "md" ? 40 : 30}
          />
        </div>
      )}
    </div>
  );
}

// KPI Card Grid component for layout
interface KpiCardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

function KpiCardGrid({ children, columns = 4, className }: KpiCardGridProps) {
  const gridClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridClasses[columns], className)}>
      {children}
    </div>
  );
}

// Progress KPI Card variant
interface ProgressKpiCardProps {
  title: string;
  current: number;
  target: number;
  unit?: string;
  className?: string;
}

function ProgressKpiCard({
  title,
  current,
  target,
  unit = "",
  className,
}: ProgressKpiCardProps) {
  const percentage = Math.min((current / target) * 100, 100);
  const isComplete = percentage >= 100;

  return (
    <div
      className={cn(
        "rounded-xl bg-card border border-border p-5 shadow-sm hover:shadow-md transition-all duration-300",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <span className={cn(
          "text-xs font-medium px-2 py-1 rounded-full",
          isComplete
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        )}>
          {percentage.toFixed(0)}%
        </span>
      </div>

      <div className="mb-2">
        <span className="text-3xl font-bold tracking-tight text-foreground">
          {formatNumber(current)}
          <span className="text-lg text-muted-foreground ml-1">{unit}</span>
        </span>
      </div>

      <div className="text-xs text-muted-foreground mb-3">
        von {formatNumber(target)} {unit}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isComplete ? "bg-emerald-500" : "bg-primary"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Comparison KPI Card variant
interface ComparisonKpiCardProps {
  title: string;
  currentValue: number;
  previousValue: number;
  currentLabel?: string;
  previousLabel?: string;
  className?: string;
}

function ComparisonKpiCard({
  title,
  currentValue,
  previousValue,
  currentLabel = "Aktuell",
  previousLabel = "Vormonat",
  className,
}: ComparisonKpiCardProps) {
  const change = previousValue !== 0
    ? ((currentValue - previousValue) / previousValue) * 100
    : 0;

  return (
    <div
      className={cn(
        "rounded-xl bg-card border border-border p-5 shadow-sm hover:shadow-md transition-all duration-300",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <TrendIndicator value={change} size="sm" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">{currentLabel}</div>
          <div className="text-2xl font-bold text-foreground">
            {formatNumber(currentValue)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">{previousLabel}</div>
          <div className="text-2xl font-bold text-muted-foreground">
            {formatNumber(previousValue)}
          </div>
        </div>
      </div>
    </div>
  );
}

export {
  KpiCard,
  KpiCardGrid,
  ProgressKpiCard,
  ComparisonKpiCard,
  TrendIndicator,
  Sparkline,
  formatNumber,
  formatPercent,
};
