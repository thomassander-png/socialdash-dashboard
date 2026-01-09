/**
 * PREMIUM CHART GENERATOR
 * 
 * Hightech-Visualisierung für Profiagentur-Reports
 * - Apache ECharts für enterprise-grade Diagramme
 * - Sharp für gestochen scharfe Bildverarbeitung
 * - 4x Auflösung für maximale Qualität
 * - Moderne Gradients und visuelle Effekte
 */

import * as echarts from 'echarts';
import { createCanvas } from 'canvas';
import * as sharp from 'sharp';

// HIGH RESOLUTION - 4x für gestochen scharfe Darstellung
const SCALE_FACTOR = 4;
const CHART_WIDTH = 1200 * SCALE_FACTOR;  // 4800px
const CHART_HEIGHT = 500 * SCALE_FACTOR;  // 2000px

// Premium Famefact Farbpalette mit Gradients
const PREMIUM_COLORS = {
  // Primary brand colors
  primary: '#1E3A8A',
  primaryLight: '#3B82F6',
  primaryDark: '#1E40AF',
  
  // Accent colors
  accent: '#2563EB',
  accentLight: '#60A5FA',
  
  // Chart colors - Premium gradient-ready
  chartBlue: '#2563EB',
  chartBlueLight: '#93C5FD',
  chartGreen: '#10B981',
  chartGreenLight: '#6EE7B7',
  chartPurple: '#8B5CF6',
  chartPurpleLight: '#C4B5FD',
  chartOrange: '#F59E0B',
  chartOrangeLight: '#FCD34D',
  
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
  
  // Semantic colors
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};

// Premium font configuration
const FONT_CONFIG = {
  family: 'Arial, Helvetica, sans-serif',
  titleSize: 24,
  labelSize: 16,
  valueSize: 20,
  tickSize: 14,
};

/**
 * Initialize ECharts with Canvas
 */
function createEChartsCanvas(width: number, height: number): { canvas: ReturnType<typeof createCanvas>; chart: echarts.ECharts } {
  const canvas = createCanvas(width, height);
  
  // @ts-expect-error - ECharts accepts canvas from node-canvas
  const chart = echarts.init(canvas, null, {
    width,
    height,
    renderer: 'canvas',
  });
  
  return { canvas, chart };
}

/**
 * Render chart to high-quality PNG buffer using Sharp
 */
async function renderChartToBuffer(canvas: ReturnType<typeof createCanvas>): Promise<Buffer> {
  const buffer = canvas.toBuffer('image/png');
  
  // Use Sharp for additional quality optimization
  const optimizedBuffer = await sharp.default(buffer)
    .png({
      quality: 100,
      compressionLevel: 9,
    })
    .sharpen({
      sigma: 0.5,
    })
    .toBuffer();
  
  return optimizedBuffer;
}

/**
 * Convert buffer to base64 data URL
 */
function bufferToBase64(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

export interface BarChartData {
  labels: string[];
  values: number[];
  label?: string;
  color?: string;
  images?: (string | null)[];  // Optional images for each bar
}

export interface ChartOptions {
  title?: string;
  showValues?: boolean;
  showLegend?: boolean;
  maxValue?: number;
  horizontal?: boolean;
  gradient?: boolean;
  darkMode?: boolean;
}

/**
 * Generate a PREMIUM bar chart with ECharts
 * Features: Gradients, rounded corners, shadows, data labels
 */
export async function generatePremiumBarChart(
  data: BarChartData,
  options: ChartOptions = {}
): Promise<string> {
  const {
    showValues = true,
    maxValue,
    gradient = true,
  } = options;

  const { canvas, chart } = createEChartsCanvas(CHART_WIDTH, CHART_HEIGHT);

  // Premium gradient configuration
  const barColor = gradient ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: PREMIUM_COLORS.chartBlue },
    { offset: 1, color: PREMIUM_COLORS.primaryDark },
  ]) : PREMIUM_COLORS.chartBlue;

  const chartOption: echarts.EChartsOption = {
    backgroundColor: PREMIUM_COLORS.white,
    animation: false,
    grid: {
      left: 100 * SCALE_FACTOR,
      right: 80 * SCALE_FACTOR,
      top: 120 * SCALE_FACTOR,
      bottom: 100 * SCALE_FACTOR,
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: data.labels,
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        fontSize: FONT_CONFIG.labelSize * SCALE_FACTOR,
        fontFamily: FONT_CONFIG.family,
        color: PREMIUM_COLORS.gray600,
        margin: 20 * SCALE_FACTOR,
      },
    },
    yAxis: {
      type: 'value',
      max: maxValue,
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        lineStyle: {
          color: PREMIUM_COLORS.gray200,
          width: 2 * SCALE_FACTOR,
          type: 'dashed',
        },
      },
      axisLabel: {
        fontSize: FONT_CONFIG.tickSize * SCALE_FACTOR,
        fontFamily: FONT_CONFIG.family,
        color: PREMIUM_COLORS.gray500,
        formatter: (value: number) => value.toLocaleString('de-DE'),
      },
    },
    series: [
      {
        name: data.label || 'Wert',
        type: 'bar',
        data: data.values,
        barWidth: '60%',
        itemStyle: {
          color: barColor,
          borderRadius: [12 * SCALE_FACTOR, 12 * SCALE_FACTOR, 0, 0],
          shadowColor: 'rgba(37, 99, 235, 0.3)',
          shadowBlur: 20 * SCALE_FACTOR,
          shadowOffsetY: 10 * SCALE_FACTOR,
        },
        label: showValues ? {
          show: true,
          position: 'top',
          fontSize: FONT_CONFIG.valueSize * SCALE_FACTOR,
          fontFamily: FONT_CONFIG.family,
          fontWeight: 'bold',
          color: PREMIUM_COLORS.gray800,
          formatter: '{c}',
          distance: 15 * SCALE_FACTOR,
        } : { show: false },
        emphasis: {
          itemStyle: {
            shadowBlur: 30 * SCALE_FACTOR,
            shadowColor: 'rgba(37, 99, 235, 0.5)',
          },
        },
      },
    ],
  };

  chart.setOption(chartOption);
  
  const buffer = await renderChartToBuffer(canvas);
  chart.dispose();
  
  return bufferToBase64(buffer);
}

/**
 * Generate a comparison bar chart (current vs previous period)
 * Features: Grouped bars, legend, gradient fills
 */
export async function generatePremiumComparisonChart(
  currentData: BarChartData,
  previousData: BarChartData
): Promise<string> {
  const { canvas, chart } = createEChartsCanvas(CHART_WIDTH, CHART_HEIGHT);

  const chartOption: echarts.EChartsOption = {
    backgroundColor: PREMIUM_COLORS.white,
    animation: false,
    legend: {
      show: true,
      top: 30 * SCALE_FACTOR,
      textStyle: {
        fontSize: FONT_CONFIG.labelSize * SCALE_FACTOR,
        fontFamily: FONT_CONFIG.family,
        color: PREMIUM_COLORS.gray700,
      },
      itemWidth: 40 * SCALE_FACTOR,
      itemHeight: 20 * SCALE_FACTOR,
      itemGap: 40 * SCALE_FACTOR,
    },
    grid: {
      left: 100 * SCALE_FACTOR,
      right: 80 * SCALE_FACTOR,
      top: 150 * SCALE_FACTOR,
      bottom: 100 * SCALE_FACTOR,
    },
    xAxis: {
      type: 'category',
      data: currentData.labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        fontSize: FONT_CONFIG.labelSize * SCALE_FACTOR,
        fontFamily: FONT_CONFIG.family,
        color: PREMIUM_COLORS.gray600,
        margin: 20 * SCALE_FACTOR,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          color: PREMIUM_COLORS.gray200,
          width: 2 * SCALE_FACTOR,
          type: 'dashed',
        },
      },
      axisLabel: {
        fontSize: FONT_CONFIG.tickSize * SCALE_FACTOR,
        fontFamily: FONT_CONFIG.family,
        color: PREMIUM_COLORS.gray500,
        formatter: (value: number) => value.toLocaleString('de-DE'),
      },
    },
    series: [
      {
        name: currentData.label || 'Aktuell',
        type: 'bar',
        data: currentData.values,
        barWidth: '35%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: PREMIUM_COLORS.chartBlue },
            { offset: 1, color: PREMIUM_COLORS.primaryDark },
          ]),
          borderRadius: [8 * SCALE_FACTOR, 8 * SCALE_FACTOR, 0, 0],
          shadowColor: 'rgba(37, 99, 235, 0.2)',
          shadowBlur: 15 * SCALE_FACTOR,
        },
        label: {
          show: true,
          position: 'top',
          fontSize: FONT_CONFIG.tickSize * SCALE_FACTOR,
          fontFamily: FONT_CONFIG.family,
          fontWeight: 'bold',
          color: PREMIUM_COLORS.gray800,
          formatter: '{c}',
        },
      },
      {
        name: previousData.label || 'Vormonat',
        type: 'bar',
        data: previousData.values,
        barWidth: '35%',
        itemStyle: {
          color: PREMIUM_COLORS.gray300,
          borderRadius: [8 * SCALE_FACTOR, 8 * SCALE_FACTOR, 0, 0],
        },
        label: {
          show: true,
          position: 'top',
          fontSize: FONT_CONFIG.tickSize * SCALE_FACTOR,
          fontFamily: FONT_CONFIG.family,
          color: PREMIUM_COLORS.gray600,
          formatter: '{c}',
        },
      },
    ],
  };

  chart.setOption(chartOption);
  
  const buffer = await renderChartToBuffer(canvas);
  chart.dispose();
  
  return bufferToBase64(buffer);
}

/**
 * Generate a premium line chart for trends
 * Features: Smooth curves, area fill, gradient, animated feel
 */
export async function generatePremiumLineChart(
  data: BarChartData
): Promise<string> {
  const { canvas, chart } = createEChartsCanvas(CHART_WIDTH, CHART_HEIGHT);

  const chartOption: echarts.EChartsOption = {
    backgroundColor: PREMIUM_COLORS.white,
    animation: false,
    grid: {
      left: 100 * SCALE_FACTOR,
      right: 80 * SCALE_FACTOR,
      top: 100 * SCALE_FACTOR,
      bottom: 100 * SCALE_FACTOR,
    },
    xAxis: {
      type: 'category',
      data: data.labels,
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: PREMIUM_COLORS.gray300,
          width: 2 * SCALE_FACTOR,
        },
      },
      axisTick: { show: false },
      axisLabel: {
        fontSize: FONT_CONFIG.labelSize * SCALE_FACTOR,
        fontFamily: FONT_CONFIG.family,
        color: PREMIUM_COLORS.gray600,
        margin: 20 * SCALE_FACTOR,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          color: PREMIUM_COLORS.gray200,
          width: 2 * SCALE_FACTOR,
          type: 'dashed',
        },
      },
      axisLabel: {
        fontSize: FONT_CONFIG.tickSize * SCALE_FACTOR,
        fontFamily: FONT_CONFIG.family,
        color: PREMIUM_COLORS.gray500,
        formatter: (value: number) => value.toLocaleString('de-DE'),
      },
    },
    series: [
      {
        name: data.label || 'Trend',
        type: 'line',
        data: data.values,
        smooth: 0.4,
        symbol: 'circle',
        symbolSize: 16 * SCALE_FACTOR,
        lineStyle: {
          width: 6 * SCALE_FACTOR,
          color: PREMIUM_COLORS.chartBlue,
          shadowColor: 'rgba(37, 99, 235, 0.3)',
          shadowBlur: 15 * SCALE_FACTOR,
          shadowOffsetY: 8 * SCALE_FACTOR,
        },
        itemStyle: {
          color: PREMIUM_COLORS.chartBlue,
          borderColor: PREMIUM_COLORS.white,
          borderWidth: 4 * SCALE_FACTOR,
          shadowColor: 'rgba(37, 99, 235, 0.4)',
          shadowBlur: 10 * SCALE_FACTOR,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(37, 99, 235, 0.25)' },
            { offset: 1, color: 'rgba(37, 99, 235, 0.02)' },
          ]),
        },
        label: {
          show: true,
          position: 'top',
          fontSize: FONT_CONFIG.valueSize * SCALE_FACTOR,
          fontFamily: FONT_CONFIG.family,
          fontWeight: 'bold',
          color: PREMIUM_COLORS.gray800,
          formatter: '{c}',
          distance: 20 * SCALE_FACTOR,
        },
      },
    ],
  };

  chart.setOption(chartOption);
  
  const buffer = await renderChartToBuffer(canvas);
  chart.dispose();
  
  return bufferToBase64(buffer);
}

/**
 * Generate a premium doughnut/pie chart
 * Features: 3D effect, shadows, gradient fills, elegant labels
 */
export async function generatePremiumDoughnutChart(
  labels: string[],
  values: number[],
  colors?: string[],
  options: ChartOptions = {}
): Promise<string> {
  const { canvas, chart } = createEChartsCanvas(CHART_WIDTH, CHART_HEIGHT);

  const defaultColors = [
    PREMIUM_COLORS.chartBlue,
    PREMIUM_COLORS.chartGreen,
    PREMIUM_COLORS.chartPurple,
    PREMIUM_COLORS.chartOrange,
    PREMIUM_COLORS.danger,
  ];

  const chartColors = colors || defaultColors;

  const chartData = labels.map((label, index) => ({
    name: label,
    value: values[index],
    itemStyle: {
      color: chartColors[index % chartColors.length],
      shadowColor: 'rgba(0, 0, 0, 0.15)',
      shadowBlur: 20 * SCALE_FACTOR,
      shadowOffsetX: 5 * SCALE_FACTOR,
      shadowOffsetY: 5 * SCALE_FACTOR,
    },
  }));

  const chartOption: echarts.EChartsOption = {
    backgroundColor: PREMIUM_COLORS.white,
    animation: false,
    legend: {
      show: true,
      orient: 'vertical',
      right: 80 * SCALE_FACTOR,
      top: 'center',
      textStyle: {
        fontSize: FONT_CONFIG.labelSize * SCALE_FACTOR,
        fontFamily: FONT_CONFIG.family,
        color: PREMIUM_COLORS.gray700,
      },
      itemWidth: 30 * SCALE_FACTOR,
      itemHeight: 20 * SCALE_FACTOR,
      itemGap: 30 * SCALE_FACTOR,
    },
    series: [
      {
        name: options.title || 'Verteilung',
        type: 'pie',
        radius: ['45%', '75%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 12 * SCALE_FACTOR,
          borderColor: PREMIUM_COLORS.white,
          borderWidth: 4 * SCALE_FACTOR,
        },
        label: {
          show: true,
          position: 'outside',
          fontSize: FONT_CONFIG.valueSize * SCALE_FACTOR,
          fontFamily: FONT_CONFIG.family,
          fontWeight: 'bold',
          color: PREMIUM_COLORS.gray800,
          formatter: '{d}%',
        },
        labelLine: {
          show: true,
          length: 30 * SCALE_FACTOR,
          length2: 20 * SCALE_FACTOR,
          lineStyle: {
            width: 3 * SCALE_FACTOR,
            color: PREMIUM_COLORS.gray400,
          },
        },
        data: chartData,
        emphasis: {
          itemStyle: {
            shadowBlur: 30 * SCALE_FACTOR,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
          },
          scale: true,
          scaleSize: 10,
        },
      },
    ],
  };

  chart.setOption(chartOption);
  
  const buffer = await renderChartToBuffer(canvas);
  chart.dispose();
  
  return bufferToBase64(buffer);
}

/**
 * Optimize an image using Sharp for maximum quality
 * Features: Resize, sharpen, optimize compression
 */
export async function optimizeImage(
  imageBuffer: Buffer,
  width: number = 1080,
  height: number = 1080
): Promise<Buffer> {
  return await sharp.default(imageBuffer)
    .resize(width, height, {
      fit: 'cover',
      position: 'center',
      kernel: 'lanczos3',  // Best quality resampling
    })
    .sharpen({
      sigma: 1.0,
    })
    .png({
      quality: 100,
      compressionLevel: 9,
    })
    .toBuffer();
}

/**
 * Fetch and optimize an image from URL
 */
export async function fetchAndOptimizeImage(
  url: string,
  width: number = 1080,
  height: number = 1080
): Promise<string | null> {
  try {
    if (!url) return null;
    
    // Try to get higher resolution image
    let highResUrl = url;
    if (url.includes('fbcdn.net') || url.includes('cdninstagram.com')) {
      highResUrl = url.replace(/\/s\d+x\d+\//, '/s1080x1080/');
    }
    
    const response = await fetch(highResUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });
    
    if (!response.ok) {
      // Fallback to original URL
      const fallbackResponse = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      });
      if (!fallbackResponse.ok) return null;
      
      const buffer = Buffer.from(await fallbackResponse.arrayBuffer());
      const optimized = await optimizeImage(buffer, width, height);
      return `data:image/png;base64,${optimized.toString('base64')}`;
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    const optimized = await optimizeImage(buffer, width, height);
    return `data:image/png;base64,${optimized.toString('base64')}`;
  } catch (error) {
    console.error('Image fetch/optimize error:', error);
    return null;
  }
}

// Export color constants for use in other modules
export { PREMIUM_COLORS, FONT_CONFIG, SCALE_FACTOR };
