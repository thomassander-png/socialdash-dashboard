/**
 * CHART GENERATOR
 * 
 * Generiert SVG-basierte Charts für PPTX Reports
 * Keine Canvas-Abhängigkeit - funktioniert auf Vercel Serverless
 */

// Famefact brand colors - Premium palette
const COLORS = {
  primary: '#1E3A8A',      // Dark blue
  secondary: '#2563EB',    // Blue
  accent: '#3B82F6',       // Light blue
  success: '#10B981',      // Green
  warning: '#F59E0B',      // Orange
  danger: '#EF4444',       // Red
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  mediumGray: '#E5E7EB',
  darkGray: '#374151',
  borderGray: '#D1D5DB',
  white: '#FFFFFF',
  black: '#1F2937',
  famefactBlack: '#0D0D0D',
  famefactGreen: '#84CC16',
};

export interface BarChartData {
  labels: string[];
  values: number[];
  label?: string;
  color?: string;
}

export interface ChartOptions {
  title?: string;
  showValues?: boolean;
  showLegend?: boolean;
  maxValue?: number;
}

/**
 * Generate bar chart data for PPTX native charts
 * Returns data structure compatible with PptxGenJS addChart
 */
export function generateBarChartData(
  data: BarChartData,
  options: ChartOptions = {}
): { chartData: Array<{ name: string; labels: string[]; values: number[] }>; chartOptions: Record<string, unknown> } {
  const { showValues = true, maxValue } = options;
  
  const chartData = [
    {
      name: data.label || 'Wert',
      labels: data.labels,
      values: data.values,
    },
  ];
  
  const chartOptions = {
    x: 0.5,
    y: 1.5,
    w: 12.33,
    h: 4.5,
    barDir: 'bar',
    barGapWidthPct: 50,
    chartColors: [COLORS.secondary],
    showValue: showValues,
    valAxisMaxVal: maxValue,
    valAxisMinVal: 0,
    catAxisTitle: '',
    valAxisTitle: '',
    showLegend: false,
    legendPos: 'b',
    dataLabelPosition: 'outEnd',
    dataLabelFontSize: 10,
    dataLabelColor: COLORS.darkGray,
    catAxisLabelColor: COLORS.gray,
    valAxisLabelColor: COLORS.gray,
    catAxisLabelFontSize: 9,
    valAxisLabelFontSize: 9,
    catAxisLineShow: false,
    valAxisLineShow: false,
    catGridLine: { style: 'none' },
    valGridLine: { color: COLORS.lightGray, style: 'solid', size: 0.5 },
  };
  
  return { chartData, chartOptions };
}

/**
 * Generate a simple bar chart as base64 PNG
 * Uses a simple SVG-to-PNG approach without canvas
 */
export async function generateBarChart(
  data: BarChartData,
  options: ChartOptions = {}
): Promise<string> {
  const { showValues = true, maxValue: customMaxValue } = options;
  
  const width = 1200;
  const height = 500;
  const padding = { top: 60, right: 40, bottom: 80, left: 80 };
  
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const maxValue = customMaxValue || Math.max(...data.values) * 1.2;
  const barWidth = (chartWidth / data.values.length) * 0.6;
  const barGap = (chartWidth / data.values.length) * 0.4;
  
  // Generate SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  
  // Background
  svg += `<rect width="${width}" height="${height}" fill="${COLORS.white}"/>`;
  
  // Grid lines
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i;
    svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="${COLORS.lightGray}" stroke-width="1" stroke-dasharray="4,4"/>`;
  }
  
  // Bars
  data.values.forEach((value, index) => {
    const barHeight = (value / maxValue) * chartHeight;
    const x = padding.left + index * (barWidth + barGap) + barGap / 2;
    const y = padding.top + chartHeight - barHeight;
    
    // Bar with gradient effect
    svg += `<defs><linearGradient id="barGrad${index}" x1="0%" y1="0%" x2="0%" y2="100%">`;
    svg += `<stop offset="0%" style="stop-color:${COLORS.accent};stop-opacity:1"/>`;
    svg += `<stop offset="100%" style="stop-color:${COLORS.secondary};stop-opacity:1"/>`;
    svg += `</linearGradient></defs>`;
    
    svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="url(#barGrad${index})" rx="4" ry="4"/>`;
    
    // Value label
    if (showValues) {
      svg += `<text x="${x + barWidth / 2}" y="${y - 10}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${COLORS.darkGray}">${value.toLocaleString('de-DE')}</text>`;
    }
    
    // X-axis label
    svg += `<text x="${x + barWidth / 2}" y="${height - padding.bottom + 30}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="${COLORS.gray}">${data.labels[index]}</text>`;
  });
  
  svg += '</svg>';
  
  // Convert SVG to base64 data URL
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

export { COLORS };
