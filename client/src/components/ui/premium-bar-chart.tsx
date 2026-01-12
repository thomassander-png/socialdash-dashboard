import * as React from "react";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { formatNumber } from "./kpi-card";

// Custom bar shape with rounded corners
const RoundedBar = (props: any) => {
  const { x, y, width, height, fill } = props;
  const radius = 6;

  if (height <= 0) return null;

  return (
    <g>
      <defs>
        <linearGradient id={`barGradient-${x}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity={1} />
          <stop offset="100%" stopColor={fill} stopOpacity={0.7} />
        </linearGradient>
      </defs>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={radius}
        ry={radius}
        fill={`url(#barGradient-${x})`}
        className="transition-all duration-300 hover:opacity-80"
      />
    </g>
  );
};

// Custom tooltip
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  valueLabel?: string;
  valueFormatter?: (value: number) => string;
}

function CustomTooltip({
  active,
  payload,
  label,
  valueLabel = "Wert",
  valueFormatter = formatNumber,
}: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[120px]">
      <p className="text-sm font-medium text-foreground mb-1">{label}</p>
      <p className="text-xs text-muted-foreground">
        {valueLabel}: <span className="font-semibold text-foreground">{valueFormatter(payload[0].value)}</span>
      </p>
    </div>
  );
}

// Image label component for bars
interface ImageLabelProps {
  x?: number;
  y?: number;
  width?: number;
  value?: string;
  imageUrl?: string;
}

function ImageLabel({ x = 0, y = 0, width = 0, imageUrl }: ImageLabelProps) {
  if (!imageUrl) return null;

  const imageSize = Math.min(width - 8, 40);
  const imageX = x + (width - imageSize) / 2;
  const imageY = y - imageSize - 8;

  return (
    <g>
      <defs>
        <clipPath id={`imageClip-${x}`}>
          <rect
            x={imageX}
            y={imageY}
            width={imageSize}
            height={imageSize}
            rx={6}
            ry={6}
          />
        </clipPath>
      </defs>
      <image
        x={imageX}
        y={imageY}
        width={imageSize}
        height={imageSize}
        href={imageUrl}
        clipPath={`url(#imageClip-${x})`}
        preserveAspectRatio="xMidYMid slice"
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}
      />
      <rect
        x={imageX}
        y={imageY}
        width={imageSize}
        height={imageSize}
        rx={6}
        ry={6}
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={2}
      />
    </g>
  );
}

// Main Premium Bar Chart component
interface PremiumBarChartProps {
  data: Array<{
    name: string;
    value: number;
    imageUrl?: string;
    color?: string;
  }>;
  title?: string;
  subtitle?: string;
  valueLabel?: string;
  valueFormatter?: (value: number) => string;
  showImages?: boolean;
  showGrid?: boolean;
  showLabels?: boolean;
  height?: number;
  colors?: string[];
  className?: string;
  orientation?: "vertical" | "horizontal";
}

function PremiumBarChart({
  data,
  title,
  subtitle,
  valueLabel = "Wert",
  valueFormatter = formatNumber,
  showImages = true,
  showGrid = true,
  showLabels = true,
  height = 300,
  colors = ["#22c55e", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"],
  className,
  orientation = "vertical",
}: PremiumBarChartProps) {
  const chartHeight = showImages ? height + 60 : height;

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
      <div style={{ width: "100%", height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          {orientation === "vertical" ? (
            <BarChart
              data={data}
              margin={{
                top: showImages ? 60 : 20,
                right: 20,
                left: 20,
                bottom: 20,
              }}
            >
              {showGrid && (
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
              )}
              <XAxis
                dataKey="name"
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
                content={
                  <CustomTooltip
                    valueLabel={valueLabel}
                    valueFormatter={valueFormatter}
                  />
                }
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
              />
              <Bar
                dataKey="value"
                shape={<RoundedBar />}
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || colors[index % colors.length]}
                  />
                ))}
                {showImages && (
                  <LabelList
                    dataKey="imageUrl"
                    content={(props: any) => {
                      const { x, y, width, value } = props;
                      return (
                        <ImageLabel
                          x={x}
                          y={y}
                          width={width}
                          imageUrl={value}
                        />
                      );
                    }}
                  />
                )}
                {showLabels && (
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={valueFormatter}
                    fill="hsl(var(--foreground))"
                    fontSize={12}
                    fontWeight={600}
                    offset={showImages ? 50 : 10}
                  />
                )}
              </Bar>
            </BarChart>
          ) : (
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 20, right: 80, left: 80, bottom: 20 }}
            >
              {showGrid && (
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  horizontal={false}
                />
              )}
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={valueFormatter}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                width={70}
              />
              <Tooltip
                content={
                  <CustomTooltip
                    valueLabel={valueLabel}
                    valueFormatter={valueFormatter}
                  />
                }
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
              />
              <Bar
                dataKey="value"
                shape={<RoundedBar />}
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || colors[index % colors.length]}
                  />
                ))}
                {showLabels && (
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={valueFormatter}
                    fill="hsl(var(--foreground))"
                    fontSize={12}
                    fontWeight={600}
                  />
                )}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Comparison Bar Chart (side by side)
interface ComparisonBarChartProps {
  data: Array<{
    name: string;
    current: number;
    previous: number;
  }>;
  title?: string;
  subtitle?: string;
  currentLabel?: string;
  previousLabel?: string;
  valueFormatter?: (value: number) => string;
  height?: number;
  className?: string;
}

function ComparisonBarChart({
  data,
  title,
  subtitle,
  currentLabel = "Aktuell",
  previousLabel = "Vormonat",
  valueFormatter = formatNumber,
  height = 300,
  className,
}: ComparisonBarChartProps) {
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

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-sm text-muted-foreground">{currentLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span className="text-sm text-muted-foreground">{previousLabel}</span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="name"
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
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-popover border border-border rounded-lg shadow-xl p-3">
                    <p className="text-sm font-medium text-foreground mb-2">{label}</p>
                    {payload.map((entry, index) => (
                      <p key={index} className="text-xs text-muted-foreground">
                        {entry.name}: <span className="font-semibold text-foreground">{valueFormatter(entry.value as number)}</span>
                      </p>
                    ))}
                  </div>
                );
              }}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
            />
            <Bar
              dataKey="current"
              name={currentLabel}
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
              animationDuration={1000}
            />
            <Bar
              dataKey="previous"
              name={previousLabel}
              fill="#9ca3af"
              radius={[4, 4, 0, 0]}
              animationDuration={1000}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export { PremiumBarChart, ComparisonBarChart, CustomTooltip, RoundedBar };
