import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration, Chart } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register datalabels plugin globally
Chart.register(ChartDataLabels);

// HIGH RESOLUTION - 3x for crisp display in PPTX
const SCALE_FACTOR = 3;
const CHART_WIDTH = 1200 * SCALE_FACTOR;  // 3600px
const CHART_HEIGHT = 500 * SCALE_FACTOR;  // 1500px

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
  white: '#FFFFFF',
  black: '#1F2937',
  gradient1: '#2563EB',
  gradient2: '#1D4ED8',
};

// Premium fonts
const FONT_FAMILY = 'Arial, Helvetica, sans-serif';

// Create HIGH RESOLUTION chart renderer
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width: CHART_WIDTH,
  height: CHART_HEIGHT,
  backgroundColour: 'white',
});

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
  horizontal?: boolean;
}

/**
 * Generate a PREMIUM HIGH-RESOLUTION bar chart as base64 image
 */
export async function generateBarChart(
  data: BarChartData,
  options: ChartOptions = {}
): Promise<string> {
  const {
    showValues = true,
    showLegend = false,
    maxValue,
  } = options;

  // Scale font sizes for high resolution
  const baseFontSize = 14 * SCALE_FACTOR;
  const titleFontSize = 18 * SCALE_FACTOR;
  const valueFontSize = 16 * SCALE_FACTOR;

  const configuration: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [{
        label: data.label || 'Wert',
        data: data.values,
        backgroundColor: data.color || COLORS.secondary,
        borderColor: data.color || COLORS.secondary,
        borderWidth: 0,
        borderRadius: 8 * SCALE_FACTOR,
        barThickness: 80 * SCALE_FACTOR,
      }],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: showLegend,
          position: 'top',
          labels: {
            font: {
              family: FONT_FAMILY,
              size: baseFontSize,
              weight: 'bold',
            },
            color: COLORS.black,
            padding: 20 * SCALE_FACTOR,
          },
        },
        title: {
          display: false,
        },
        // @ts-expect-error - datalabels plugin
        datalabels: {
          display: showValues,
          anchor: 'end',
          align: 'top',
          offset: 8 * SCALE_FACTOR,
          font: {
            family: FONT_FAMILY,
            size: valueFontSize,
            weight: 'bold',
          },
          color: COLORS.black,
          formatter: (value: number) => value.toLocaleString('de-DE'),
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          border: {
            display: false,
          },
          ticks: {
            font: {
              family: FONT_FAMILY,
              size: baseFontSize,
              weight: '500',
            },
            color: COLORS.gray,
            padding: 10 * SCALE_FACTOR,
          },
        },
        y: {
          beginAtZero: true,
          max: maxValue,
          grid: {
            color: COLORS.lightGray,
            lineWidth: 1 * SCALE_FACTOR,
          },
          border: {
            display: false,
          },
          ticks: {
            font: {
              family: FONT_FAMILY,
              size: baseFontSize,
            },
            color: COLORS.gray,
            padding: 10 * SCALE_FACTOR,
            callback: (value: number | string) => {
              if (typeof value === 'number') {
                return value.toLocaleString('de-DE');
              }
              return value;
            },
          },
        },
      },
      layout: {
        padding: {
          top: 60 * SCALE_FACTOR,
          right: 40 * SCALE_FACTOR,
          bottom: 20 * SCALE_FACTOR,
          left: 40 * SCALE_FACTOR,
        },
      },
    },
    plugins: [{
      id: 'customCanvasBackgroundColor',
      beforeDraw: (chart) => {
        const { ctx } = chart;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = COLORS.white;
        ctx.fillRect(0, 0, chart.width, chart.height);
        ctx.restore();
      },
    }],
  };

  const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

/**
 * Generate a comparison bar chart (current vs previous period)
 */
export async function generateComparisonChart(
  currentData: BarChartData,
  previousData: BarChartData,
  options: ChartOptions = {}
): Promise<string> {
  const baseFontSize = 14 * SCALE_FACTOR;

  const configuration: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: currentData.labels,
      datasets: [
        {
          label: currentData.label || 'Aktuell',
          data: currentData.values,
          backgroundColor: COLORS.secondary,
          borderRadius: 6 * SCALE_FACTOR,
          barThickness: 50 * SCALE_FACTOR,
        },
        {
          label: previousData.label || 'Vormonat',
          data: previousData.values,
          backgroundColor: COLORS.lightGray,
          borderRadius: 6 * SCALE_FACTOR,
          barThickness: 50 * SCALE_FACTOR,
        },
      ],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            font: {
              family: FONT_FAMILY,
              size: baseFontSize,
              weight: 'bold',
            },
            color: COLORS.black,
            padding: 20 * SCALE_FACTOR,
          },
        },
        title: {
          display: !!options.title,
          text: options.title || '',
          font: {
            family: FONT_FAMILY,
            size: 20 * SCALE_FACTOR,
            weight: 'bold',
          },
          color: COLORS.black,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            font: { family: FONT_FAMILY, size: baseFontSize },
            color: COLORS.gray,
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: COLORS.lightGray, lineWidth: SCALE_FACTOR },
          border: { display: false },
          ticks: {
            font: { family: FONT_FAMILY, size: baseFontSize },
            color: COLORS.gray,
          },
        },
      },
      layout: {
        padding: {
          top: 40 * SCALE_FACTOR,
          right: 40 * SCALE_FACTOR,
          bottom: 20 * SCALE_FACTOR,
          left: 40 * SCALE_FACTOR,
        },
      },
    },
  };

  const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

/**
 * Generate a line chart for trends
 */
export async function generateLineChart(
  data: BarChartData,
  options: ChartOptions = {}
): Promise<string> {
  const baseFontSize = 14 * SCALE_FACTOR;

  const configuration: ChartConfiguration = {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [{
        label: data.label || 'Trend',
        data: data.values,
        borderColor: COLORS.secondary,
        backgroundColor: `${COLORS.secondary}20`,
        fill: true,
        tension: 0.4,
        pointRadius: 8 * SCALE_FACTOR,
        pointBackgroundColor: COLORS.secondary,
        pointBorderColor: COLORS.white,
        pointBorderWidth: 3 * SCALE_FACTOR,
        borderWidth: 4 * SCALE_FACTOR,
      }],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: options.showLegend ?? false,
        },
        title: {
          display: !!options.title,
          text: options.title || '',
          font: {
            family: FONT_FAMILY,
            size: 20 * SCALE_FACTOR,
            weight: 'bold',
          },
          color: COLORS.black,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            font: { family: FONT_FAMILY, size: baseFontSize },
            color: COLORS.gray,
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: COLORS.lightGray, lineWidth: SCALE_FACTOR },
          border: { display: false },
          ticks: {
            font: { family: FONT_FAMILY, size: baseFontSize },
            color: COLORS.gray,
          },
        },
      },
      layout: {
        padding: {
          top: 40 * SCALE_FACTOR,
          right: 40 * SCALE_FACTOR,
          bottom: 20 * SCALE_FACTOR,
          left: 40 * SCALE_FACTOR,
        },
      },
    },
  };

  const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

/**
 * Generate a doughnut/pie chart
 */
export async function generateDoughnutChart(
  labels: string[],
  values: number[],
  colors: string[] = [COLORS.secondary, COLORS.accent, COLORS.success, COLORS.warning, COLORS.danger],
  options: ChartOptions = {}
): Promise<string> {
  const baseFontSize = 14 * SCALE_FACTOR;

  const configuration: ChartConfiguration = {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 0,
      }],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'right',
          labels: {
            font: {
              family: FONT_FAMILY,
              size: baseFontSize,
              weight: 'bold',
            },
            color: COLORS.black,
            padding: 30 * SCALE_FACTOR,
          },
        },
        title: {
          display: !!options.title,
          text: options.title || '',
          font: {
            family: FONT_FAMILY,
            size: 20 * SCALE_FACTOR,
            weight: 'bold',
          },
          color: COLORS.black,
        },
      },
      layout: {
        padding: {
          top: 20 * SCALE_FACTOR,
          right: 20 * SCALE_FACTOR,
          bottom: 20 * SCALE_FACTOR,
          left: 20 * SCALE_FACTOR,
        },
      },
    },
  };

  const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}
