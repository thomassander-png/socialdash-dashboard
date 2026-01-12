import * as React from "react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
} from "recharts";
import { formatNumber } from "./kpi-card";

// Custom dot component
const CustomDot = (props: any) => {
  const { cx, cy, stroke, payload, dataKey } = props;

  if (!cx || !cy) return null;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="white"
        stroke={stroke}
        strokeWidth={2}
        className="transition-all duration-200"
      />
    </g>
  );
};

// Active dot (on hover)
const ActiveDot = (props: any) => {
  const { cx, cy, stroke } = props;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={8}
        fill={stroke}
        fillOpacity={0.2}
        className="animate-pulse"
      />
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="white"
        stroke={stroke}
        strokeWidth={2}
      />
    </g>
  );
};

// Custom tooltip
interface LineTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  valueFormatter?: (value: number) => string;
}

function LineTooltip({
  active,
  payload,
  label,
  valueFormatter = formatNumber,
}: LineTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[140px]">
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.stroke || entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold text-foreground">
            {valueFormatter(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// Main Premium Line Chart component
interface PremiumLineChartProps {
  data: Array<Record<string, any>>;
  lines: Array<{
    dataKey: string;
    name: string;
    color: string;
    strokeWidth?: number;
    dashed?: boolean;
  }>;
  xAxisKey: string;
  title?: string;
  subtitle?: string;
  valueFormatter?: (value: number) => string;
  showGrid?: boolean;
  showDots?: boolean;
  showLegend?: boolean;
  height?: number;
  className?: string;
}

function PremiumLineChart({
  data,
  lines,
  xAxisKey,
  title,
  subtitle,
  valueFormatter = formatNumber,
  showGrid = true,
  showDots = true,
  showLegend = true,
  height = 300,
  className,
}: PremiumLineChartProps) {
  return (
    <div className={cn("rounded-xl bg-card border border-border p-5", className)}>
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      )}

      {/* Chart */}
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
            )}
            <XAxis
              dataKey={xAxisKey}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={valueFormatter}
              width={60}
            />
            <Tooltip
              content={<LineTooltip valueFormatter={valueFormatter} />}
              cursor={{
                stroke: "hsl(var(--muted-foreground))",
                strokeWidth: 1,
                strokeDasharray: "5 5",
              }}
            />
            {showLegend && (
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
            )}
            {lines.map((line) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                name={line.name}
                stroke={line.color}
                strokeWidth={line.strokeWidth || 2}
                strokeDasharray={line.dashed ? "5 5" : undefined}
                dot={showDots ? <CustomDot /> : false}
                activeDot={<ActiveDot />}
                animationDuration={1000}
                animationEasing="ease-out"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Premium Area Chart with gradient
interface PremiumAreaChartProps {
  data: Array<Record<string, any>>;
  areas: Array<{
    dataKey: string;
    name: string;
    color: string;
    fillOpacity?: number;
  }>;
  xAxisKey: string;
  title?: string;
  subtitle?: string;
  valueFormatter?: (value: number) => string;
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  height?: number;
  className?: string;
}

function PremiumAreaChart({
  data,
  areas,
  xAxisKey,
  title,
  subtitle,
  valueFormatter = formatNumber,
  showGrid = true,
  showLegend = true,
  stacked = false,
  height = 300,
  className,
}: PremiumAreaChartProps) {
  return (
    <div className={cn("rounded-xl bg-card border border-border p-5", className)}>
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      )}

      {/* Chart */}
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
          >
            <defs>
              {areas.map((area) => (
                <linearGradient
                  key={`gradient-${area.dataKey}`}
                  id={`gradient-${area.dataKey}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={area.color}
                    stopOpacity={area.fillOpacity || 0.4}
                  />
                  <stop
                    offset="100%"
                    stopColor={area.color}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
            )}
            <XAxis
              dataKey={xAxisKey}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={valueFormatter}
              width={60}
            />
            <Tooltip
              content={<LineTooltip valueFormatter={valueFormatter} />}
              cursor={{
                stroke: "hsl(var(--muted-foreground))",
                strokeWidth: 1,
                strokeDasharray: "5 5",
              }}
            />
            {showLegend && (
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
            )}
            {areas.map((area) => (
              <Area
                key={area.dataKey}
                type="monotone"
                dataKey={area.dataKey}
                name={area.name}
                stroke={area.color}
                strokeWidth={2}
                fill={`url(#gradient-${area.dataKey})`}
                stackId={stacked ? "1" : undefined}
                animationDuration={1000}
                animationEasing="ease-out"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export { PremiumLineChart, PremiumAreaChart, LineTooltip, CustomDot, ActiveDot };
