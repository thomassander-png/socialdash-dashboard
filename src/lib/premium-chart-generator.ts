/**
 * PREMIUM CHART GENERATOR
 * 
 * Hightech-Visualisierung für Profiagentur-Reports
 * SVG-basiert - keine Canvas-Abhängigkeit
 * Funktioniert auf Vercel Serverless
 */

// Premium Famefact Farbpalette
export const PREMIUM_COLORS = {
  // Primary brand colors
  primary: '#1E3A8A',
  primaryLight: '#3B82F6',
  primaryDark: '#1E40AF',
  
  // Chart colors
  chartBlue: '#2563EB',
  chartBlueLight: '#93C5FD',
  chartGreen: '#10B981',
  chartPurple: '#8B5CF6',
  chartOrange: '#F59E0B',
  
  // Neutral colors
  white: '#FFFFFF',
  black: '#111827',
  gray900: '#111827',
  gray800: '#1F2937',
  gray700: '#374151',
  gray600: '#4B5563',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  gray300: '#D1D5DB',
  gray200: '#E5E7EB',
  gray100: '#F3F4F6',
  gray50: '#F9FAFB',
  
  // Brand colors
  famefactBlack: '#0D0D0D',
  famefactGreen: '#84CC16',
};

export interface BarChartData {
  labels: string[];
  values: number[];
  label?: string;
}

export interface ChartOptions {
  showValues?: boolean;
  maxValue?: number;
  gradient?: boolean;
}

/**
 * Generate a premium bar chart as SVG base64
 */
export async function generatePremiumBarChart(
  data: BarChartData,
  options: ChartOptions = {}
): Promise<string> {
  const { showValues = true, maxValue: customMaxValue, gradient = true } = options;
  
  const width = 1200;
  const height = 500;
  const padding = { top: 80, right: 60, bottom: 100, left: 100 };
  
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const maxValue = customMaxValue || Math.max(...data.values) * 1.3;
  const barCount = data.values.length;
  const barWidth = (chartWidth / barCount) * 0.65;
  const barSpacing = chartWidth / barCount;
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  
  // Background
  svg += `<rect width="${width}" height="${height}" fill="${PREMIUM_COLORS.white}"/>`;
  
  // Gradient definitions
  if (gradient) {
    svg += `<defs>`;
    svg += `<linearGradient id="premiumBarGrad" x1="0%" y1="0%" x2="0%" y2="100%">`;
    svg += `<stop offset="0%" style="stop-color:${PREMIUM_COLORS.chartBlue};stop-opacity:1"/>`;
    svg += `<stop offset="100%" style="stop-color:${PREMIUM_COLORS.primaryDark};stop-opacity:1"/>`;
    svg += `</linearGradient>`;
    svg += `<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">`;
    svg += `<feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="${PREMIUM_COLORS.chartBlue}" flood-opacity="0.3"/>`;
    svg += `</filter>`;
    svg += `</defs>`;
  }
  
  // Grid lines (dashed, subtle)
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i;
    const gridValue = Math.round(maxValue - (maxValue / 5) * i);
    
    svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="${PREMIUM_COLORS.gray200}" stroke-width="2" stroke-dasharray="8,8"/>`;
    
    // Y-axis labels
    svg += `<text x="${padding.left - 15}" y="${y + 5}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="${PREMIUM_COLORS.gray500}">${gridValue.toLocaleString('de-DE')}</text>`;
  }
  
  // Bars
  data.values.forEach((value, index) => {
    const barHeight = (value / maxValue) * chartHeight;
    const x = padding.left + index * barSpacing + (barSpacing - barWidth) / 2;
    const y = padding.top + chartHeight - barHeight;
    
    // Bar with rounded top corners and shadow
    svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${gradient ? 'url(#premiumBarGrad)' : PREMIUM_COLORS.chartBlue}" rx="8" ry="8" filter="url(#shadow)"/>`;
    
    // Value label above bar
    if (showValues) {
      svg += `<text x="${x + barWidth / 2}" y="${y - 15}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="bold" fill="${PREMIUM_COLORS.gray800}">${value.toLocaleString('de-DE')}</text>`;
    }
    
    // X-axis label
    svg += `<text x="${x + barWidth / 2}" y="${height - padding.bottom + 35}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="${PREMIUM_COLORS.gray600}">${data.labels[index]}</text>`;
  });
  
  svg += '</svg>';
  
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Generate a comparison bar chart
 */
export async function generatePremiumComparisonChart(
  currentData: BarChartData,
  previousData: BarChartData
): Promise<string> {
  const width = 1200;
  const height = 500;
  const padding = { top: 100, right: 60, bottom: 100, left: 100 };
  
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const allValues = [...currentData.values, ...previousData.values];
  const maxValue = Math.max(...allValues) * 1.3;
  const barCount = currentData.values.length;
  const groupWidth = chartWidth / barCount;
  const barWidth = groupWidth * 0.35;
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  
  // Background
  svg += `<rect width="${width}" height="${height}" fill="${PREMIUM_COLORS.white}"/>`;
  
  // Gradients
  svg += `<defs>`;
  svg += `<linearGradient id="currentGrad" x1="0%" y1="0%" x2="0%" y2="100%">`;
  svg += `<stop offset="0%" style="stop-color:${PREMIUM_COLORS.chartBlue};stop-opacity:1"/>`;
  svg += `<stop offset="100%" style="stop-color:${PREMIUM_COLORS.primaryDark};stop-opacity:1"/>`;
  svg += `</linearGradient>`;
  svg += `</defs>`;
  
  // Legend
  svg += `<rect x="${padding.left}" y="30" width="20" height="20" fill="url(#currentGrad)" rx="4"/>`;
  svg += `<text x="${padding.left + 30}" y="45" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="${PREMIUM_COLORS.gray700}">${currentData.label || 'Aktuell'}</text>`;
  svg += `<rect x="${padding.left + 150}" y="30" width="20" height="20" fill="${PREMIUM_COLORS.gray300}" rx="4"/>`;
  svg += `<text x="${padding.left + 180}" y="45" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="${PREMIUM_COLORS.gray700}">${previousData.label || 'Vormonat'}</text>`;
  
  // Grid lines
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i;
    svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="${PREMIUM_COLORS.gray200}" stroke-width="2" stroke-dasharray="8,8"/>`;
  }
  
  // Bars
  currentData.values.forEach((value, index) => {
    const prevValue = previousData.values[index] || 0;
    const groupX = padding.left + index * groupWidth;
    
    // Current bar
    const currentHeight = (value / maxValue) * chartHeight;
    const currentX = groupX + groupWidth * 0.15;
    const currentY = padding.top + chartHeight - currentHeight;
    svg += `<rect x="${currentX}" y="${currentY}" width="${barWidth}" height="${currentHeight}" fill="url(#currentGrad)" rx="6"/>`;
    svg += `<text x="${currentX + barWidth / 2}" y="${currentY - 10}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="bold" fill="${PREMIUM_COLORS.gray800}">${value.toLocaleString('de-DE')}</text>`;
    
    // Previous bar
    const prevHeight = (prevValue / maxValue) * chartHeight;
    const prevX = groupX + groupWidth * 0.5;
    const prevY = padding.top + chartHeight - prevHeight;
    svg += `<rect x="${prevX}" y="${prevY}" width="${barWidth}" height="${prevHeight}" fill="${PREMIUM_COLORS.gray300}" rx="6"/>`;
    svg += `<text x="${prevX + barWidth / 2}" y="${prevY - 10}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="${PREMIUM_COLORS.gray600}">${prevValue.toLocaleString('de-DE')}</text>`;
    
    // X-axis label
    svg += `<text x="${groupX + groupWidth / 2}" y="${height - padding.bottom + 35}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="${PREMIUM_COLORS.gray600}">${currentData.labels[index]}</text>`;
  });
  
  svg += '</svg>';
  
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Generate a line chart for trends
 */
export async function generatePremiumLineChart(
  data: BarChartData
): Promise<string> {
  const width = 1200;
  const height = 500;
  const padding = { top: 80, right: 60, bottom: 100, left: 100 };
  
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const maxValue = Math.max(...data.values) * 1.3;
  const pointCount = data.values.length;
  const pointSpacing = chartWidth / (pointCount - 1);
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  
  // Background
  svg += `<rect width="${width}" height="${height}" fill="${PREMIUM_COLORS.white}"/>`;
  
  // Gradient for area fill
  svg += `<defs>`;
  svg += `<linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">`;
  svg += `<stop offset="0%" style="stop-color:${PREMIUM_COLORS.chartBlue};stop-opacity:0.25"/>`;
  svg += `<stop offset="100%" style="stop-color:${PREMIUM_COLORS.chartBlue};stop-opacity:0.02"/>`;
  svg += `</linearGradient>`;
  svg += `</defs>`;
  
  // Grid lines
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i;
    svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="${PREMIUM_COLORS.gray200}" stroke-width="2" stroke-dasharray="8,8"/>`;
  }
  
  // Calculate points
  const points: Array<{ x: number; y: number }> = data.values.map((value, index) => ({
    x: padding.left + index * pointSpacing,
    y: padding.top + chartHeight - (value / maxValue) * chartHeight,
  }));
  
  // Area fill
  let areaPath = `M ${points[0].x} ${padding.top + chartHeight}`;
  points.forEach(p => { areaPath += ` L ${p.x} ${p.y}`; });
  areaPath += ` L ${points[points.length - 1].x} ${padding.top + chartHeight} Z`;
  svg += `<path d="${areaPath}" fill="url(#areaGrad)"/>`;
  
  // Line
  let linePath = `M ${points[0].x} ${points[0].y}`;
  points.slice(1).forEach(p => { linePath += ` L ${p.x} ${p.y}`; });
  svg += `<path d="${linePath}" fill="none" stroke="${PREMIUM_COLORS.chartBlue}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  
  // Points and labels
  points.forEach((point, index) => {
    svg += `<circle cx="${point.x}" cy="${point.y}" r="8" fill="${PREMIUM_COLORS.chartBlue}" stroke="${PREMIUM_COLORS.white}" stroke-width="4"/>`;
    svg += `<text x="${point.x}" y="${point.y - 20}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="bold" fill="${PREMIUM_COLORS.gray800}">${data.values[index].toLocaleString('de-DE')}</text>`;
    svg += `<text x="${point.x}" y="${height - padding.bottom + 35}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="${PREMIUM_COLORS.gray600}">${data.labels[index]}</text>`;
  });
  
  svg += '</svg>';
  
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Generate a doughnut chart
 */
export async function generatePremiumDoughnutChart(
  labels: string[],
  values: number[],
  colors?: string[]
): Promise<string> {
  const width = 600;
  const height = 500;
  const centerX = 200;
  const centerY = 250;
  const outerRadius = 150;
  const innerRadius = 90;
  
  const total = values.reduce((a, b) => a + b, 0);
  const defaultColors = [
    PREMIUM_COLORS.chartBlue,
    PREMIUM_COLORS.chartGreen,
    PREMIUM_COLORS.chartPurple,
    PREMIUM_COLORS.chartOrange,
    '#EF4444',
  ];
  const chartColors = colors || defaultColors;
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `<rect width="${width}" height="${height}" fill="${PREMIUM_COLORS.white}"/>`;
  
  let currentAngle = -Math.PI / 2;
  
  values.forEach((value, index) => {
    const sliceAngle = (value / total) * 2 * Math.PI;
    const endAngle = currentAngle + sliceAngle;
    
    const x1 = centerX + outerRadius * Math.cos(currentAngle);
    const y1 = centerY + outerRadius * Math.sin(currentAngle);
    const x2 = centerX + outerRadius * Math.cos(endAngle);
    const y2 = centerY + outerRadius * Math.sin(endAngle);
    const x3 = centerX + innerRadius * Math.cos(endAngle);
    const y3 = centerY + innerRadius * Math.sin(endAngle);
    const x4 = centerX + innerRadius * Math.cos(currentAngle);
    const y4 = centerY + innerRadius * Math.sin(currentAngle);
    
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    
    const path = `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    
    svg += `<path d="${path}" fill="${chartColors[index % chartColors.length]}"/>`;
    
    currentAngle = endAngle;
  });
  
  // Legend
  labels.forEach((label, index) => {
    const y = 50 + index * 35;
    svg += `<rect x="420" y="${y}" width="20" height="20" fill="${chartColors[index % chartColors.length]}" rx="4"/>`;
    svg += `<text x="450" y="${y + 15}" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="${PREMIUM_COLORS.gray700}">${label}</text>`;
    svg += `<text x="580" y="${y + 15}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="bold" fill="${PREMIUM_COLORS.gray800}">${Math.round((values[index] / total) * 100)}%</text>`;
  });
  
  svg += '</svg>';
  
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Fetch and return image as base64
 */
export async function fetchAndOptimizeImage(
  url: string
): Promise<string | null> {
  try {
    if (!url) return null;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) return null;
    
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('Image fetch error:', error);
    return null;
  }
}
