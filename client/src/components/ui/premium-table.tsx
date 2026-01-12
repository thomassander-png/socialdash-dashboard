import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink } from "lucide-react";
import { formatNumber, TrendIndicator } from "./kpi-card";

// Types
type SortDirection = "asc" | "desc" | null;

interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
}

// Thumbnail component
interface ThumbnailProps {
  src?: string;
  alt?: string;
  size?: "sm" | "md" | "lg";
  fallback?: React.ReactNode;
  className?: string;
}

function Thumbnail({
  src,
  alt = "Thumbnail",
  size = "md",
  fallback,
  className,
}: ThumbnailProps) {
  const [error, setError] = React.useState(false);

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  if (!src || error) {
    return (
      <div
        className={cn(
          "rounded-lg bg-muted flex items-center justify-center text-muted-foreground",
          sizeClasses[size],
          className
        )}
      >
        {fallback || (
          <svg
            className="w-1/2 h-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        "rounded-lg object-cover shadow-sm",
        sizeClasses[size],
        className
      )}
      onError={() => setError(true)}
    />
  );
}

// Sort header component
interface SortHeaderProps {
  children: React.ReactNode;
  sortable?: boolean;
  direction?: SortDirection;
  onClick?: () => void;
}

function SortHeader({ children, sortable, direction, onClick }: SortHeaderProps) {
  if (!sortable) {
    return <>{children}</>;
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 hover:text-foreground transition-colors group"
    >
      {children}
      <span className="text-muted-foreground group-hover:text-foreground">
        {direction === "asc" ? (
          <ChevronUp className="w-4 h-4" />
        ) : direction === "desc" ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronsUpDown className="w-4 h-4 opacity-50" />
        )}
      </span>
    </button>
  );
}

// Main Premium Table component
interface PremiumTableProps<T> {
  data: T[];
  columns: Column<T>[];
  title?: string;
  subtitle?: string;
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  stickyHeader?: boolean;
  maxHeight?: string;
  emptyMessage?: string;
  onRowClick?: (row: T, index: number) => void;
  defaultSort?: {
    key: string;
    direction: SortDirection;
  };
}

function PremiumTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  subtitle,
  className,
  striped = true,
  hoverable = true,
  compact = false,
  stickyHeader = false,
  maxHeight,
  emptyMessage = "Keine Daten verfügbar",
  onRowClick,
  defaultSort,
}: PremiumTableProps<T>) {
  const [sortConfig, setSortConfig] = React.useState<{
    key: string;
    direction: SortDirection;
  }>(defaultSort || { key: "", direction: null });

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : 1;
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  // Handle sort
  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key !== key) {
        return { key, direction: "desc" };
      }
      if (prev.direction === "desc") {
        return { key, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { key: "", direction: null };
      }
      return { key, direction: "desc" };
    });
  };

  // Get cell value
  const getCellValue = (row: T, column: Column<T>, index: number) => {
    const value = column.key.toString().includes(".")
      ? column.key.toString().split(".").reduce((obj, key) => obj?.[key], row as any)
      : row[column.key as keyof T];

    if (column.render) {
      return column.render(value, row, index);
    }

    if (typeof value === "number") {
      return formatNumber(value);
    }

    return value ?? "-";
  };

  const cellPadding = compact ? "px-3 py-2" : "px-4 py-3";

  return (
    <div className={cn("rounded-xl bg-card border border-border overflow-hidden", className)}>
      {/* Header */}
      {(title || subtitle) && (
        <div className="px-5 py-4 border-b border-border">
          {title && (
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      )}

      {/* Table wrapper */}
      <div
        className={cn("overflow-auto", stickyHeader && "relative")}
        style={{ maxHeight }}
      >
        <table className="w-full">
          <thead className={cn(
            "bg-muted/50",
            stickyHeader && "sticky top-0 z-10"
          )}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key.toString()}
                  className={cn(
                    "text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                    cellPadding,
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right"
                  )}
                  style={{ width: column.width }}
                >
                  <SortHeader
                    sortable={column.sortable}
                    direction={sortConfig.key === column.key ? sortConfig.direction : null}
                    onClick={() => column.sortable && handleSort(column.key.toString())}
                  >
                    {column.header}
                  </SortHeader>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => (
                <tr
                  key={index}
                  className={cn(
                    "transition-colors",
                    striped && index % 2 === 1 && "bg-muted/30",
                    hoverable && "hover:bg-muted/50",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key.toString()}
                      className={cn(
                        "text-sm text-foreground",
                        cellPadding,
                        column.align === "center" && "text-center",
                        column.align === "right" && "text-right"
                      )}
                    >
                      {getCellValue(row, column, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Pre-built cell renderers
const CellRenderers = {
  // Thumbnail with text
  thumbnailWithText: (
    imageKey: string,
    textKey: string,
    subtextKey?: string
  ) => (value: any, row: any) => (
    <div className="flex items-center gap-3">
      <Thumbnail src={row[imageKey]} size="md" />
      <div>
        <div className="font-medium text-foreground line-clamp-1">
          {row[textKey]}
        </div>
        {subtextKey && row[subtextKey] && (
          <div className="text-xs text-muted-foreground line-clamp-1">
            {row[subtextKey]}
          </div>
        )}
      </div>
    </div>
  ),

  // Number with trend
  numberWithTrend: (changeKey: string) => (value: number, row: any) => (
    <div className="flex items-center gap-2">
      <span className="font-medium">{formatNumber(value)}</span>
      {row[changeKey] !== undefined && (
        <TrendIndicator value={row[changeKey]} size="sm" showIcon={false} />
      )}
    </div>
  ),

  // Link
  link: (urlKey: string, label?: string) => (value: any, row: any) => (
    <a
      href={row[urlKey]}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {label || value}
      <ExternalLink className="w-3 h-3" />
    </a>
  ),

  // Badge
  badge: (colorMap: Record<string, string>) => (value: string) => {
    const color = colorMap[value] || "gray";
    const colorClasses: Record<string, string> = {
      green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      gray: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    };

    return (
      <span className={cn(
        "inline-flex px-2 py-1 rounded-full text-xs font-medium",
        colorClasses[color]
      )}>
        {value}
      </span>
    );
  },

  // Progress bar
  progress: (maxValue: number, color?: string) => (value: number) => {
    const percentage = Math.min((value / maxValue) * 100, 100);
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percentage}%`,
              backgroundColor: color || "hsl(var(--primary))",
            }}
          />
        </div>
        <span className="text-xs text-muted-foreground w-10 text-right">
          {percentage.toFixed(0)}%
        </span>
      </div>
    );
  },

  // Date
  date: (format: "short" | "long" = "short") => (value: string | Date) => {
    const date = typeof value === "string" ? new Date(value) : value;
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: format === "long" ? "long" : "2-digit",
      year: "numeric",
    });
  },
};

export { PremiumTable, Thumbnail, SortHeader, CellRenderers };
export type { Column, SortDirection };
