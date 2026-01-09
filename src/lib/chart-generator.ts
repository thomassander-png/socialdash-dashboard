import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration, ChartType } from 'chart.js';

// Chart dimensions for PPTX (16:9 aspect ratio)
const CHART_WIDTH = 1200;
const CHART_HEIGHT = 500;

// Famefact brand colors
const COLORS = {
  primary: '#1E3A8A',      // Dark blue
  secondary: '#2563EB',    // Blue
  accent: '#3B82F6',       // Light blue
  success: '#10B981',      // Green
  warning: '#F59E0B',      // Orange
  danger: '#EF4444',       // Red
  gray: '#6B7280',
  lightGray: '#E5E7EB',
  white: '#FFFFFF',
  black: '#000000',
};

// Create chart renderer
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
 * Generate a professional bar chart as base64 image
 */
export async function generateBarChart(
  data: BarChartData,
  options: ChartOptions = {}
): Promise<string> {
  const {
    title,
    showValues = true,
    showLegend = false,
    maxValue,
    horizontal = false,
  } = options;

  const chartType: ChartType = horizontal ? 'bar' : 'bar';
  
  const configuration: ChartConfiguration = {
    type: chartType,
    data: {
      labels: data.labels,
      datasets: [{
        label: data.label || 'Wert',
        data: data.values,
        backgroundColor: data.color || COLORS.secondary,
        borderColor: data.color || COLORS.secondary,
        borderWidth: 0,
        borderRadius: 4,
        barThickness: 60,
      }],
    },
    options: {
      indexAxis: horizontal ? 'y' : 'x',
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: showLegend,
          position: 'top',
          labels: {
            font: {
              family: 'Arial',
              size: 14,
              weight: 'bold',
            },
            color: COLORS.black,
          },
        },
        title: {
          display: !!title,
          text: title || '',
          font: {
            family: 'Arial',
            size: 20,
            weight: 'bold',
          },
          color: COLORS.black,
          padding: { bottom: 20 },
        },
        datalabels: {
          display: showValues,
          anchor: 'end',
          align: 'top',
          font: {
            family: 'Arial',
            size: 14,
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
          ticks: {
            font: {
              family: 'Arial',
              size: 12,
            },
            color: COLORS.gray,
          },
        },
        y: {
          beginAtZero: true,
          max: maxValue,
          grid: {
            color: COLORS.lightGray,
          },
          ticks: {
            font: {
              family: 'Arial',
              size: 12,
            },
            color: COLORS.gray,
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
          top: 40,
          right: 20,
          bottom: 20,
          left: 20,
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
 * Generate a bar chart with images above bars (for social media posts)
 */
export async function generateBarChartWithImages(
  data: BarChartData,
  imageUrls: (string | null)[],
  options: ChartOptions = {}
): Promise<{ chartImage: string; imagePositions: { x: number; y: number; width: number; height: number }[] }> {
  // Generate the base chart
  const chartImage = await generateBarChart(data, {
    ...options,
    showValues: true,
  });

  // Calculate image positions above each bar
  const barCount = data.values.length;
  const chartPadding = 20;
  const barAreaWidth = CHART_WIDTH - (chartPadding * 2);
  const barWidth = barAreaWidth / barCount;
  const imageWidth = barWidth * 0.7;
  const imageHeight = 80;

  const maxVal = options.maxValue || Math.max(...data.values) * 1.2;
  
  const imagePositions = data.values.map((value, index) => {
    const barHeight = (value / maxVal) * (CHART_HEIGHT - 100);
    const x = chartPadding + (index * barWidth) + (barWidth - imageWidth) / 2;
    const y = CHART_HEIGHT - barHeight - imageHeight - 60;
    
    return {
      x: x / CHART_WIDTH,  // Normalize to 0-1 range
      y: y / CHART_HEIGHT,
      width: imageWidth / CHART_WIDTH,
      height: imageHeight / CHART_HEIGHT,
    };
  });

  return { chartImage, imagePositions };
}

/**
 * Generate a comparison bar chart (current vs previous period)
 */
export async function generateComparisonChart(
  currentData: BarChartData,
  previousData: BarChartData,
  options: ChartOptions = {}
): Promise<string> {
  const configuration: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: currentData.labels,
      datasets: [
        {
          label: currentData.label || 'Aktuell',
          data: currentData.values,
          backgroundColor: COLORS.secondary,
          borderRadius: 4,
          barThickness: 40,
        },
        {
          label: previousData.label || 'Vormonat',
          data: previousData.values,
          backgroundColor: COLORS.lightGray,
          borderRadius: 4,
          barThickness: 40,
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
              family: 'Arial',
              size: 14,
            },
            color: COLORS.black,
          },
        },
        title: {
          display: !!options.title,
          text: options.title || '',
          font: {
            family: 'Arial',
            size: 20,
            weight: 'bold',
          },
          color: COLORS.black,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: 'Arial', size: 12 },
            color: COLORS.gray,
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: COLORS.lightGray },
          ticks: {
            font: { family: 'Arial', size: 12 },
            color: COLORS.gray,
          },
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
        pointRadius: 6,
        pointBackgroundColor: COLORS.secondary,
        pointBorderColor: COLORS.white,
        pointBorderWidth: 2,
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
            family: 'Arial',
            size: 20,
            weight: 'bold',
          },
          color: COLORS.black,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: 'Arial', size: 12 },
            color: COLORS.gray,
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: COLORS.lightGray },
          ticks: {
            font: { family: 'Arial', size: 12 },
            color: COLORS.gray,
          },
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
              family: 'Arial',
              size: 14,
            },
            color: COLORS.black,
            padding: 20,
          },
        },
        title: {
          display: !!options.title,
          text: options.title || '',
          font: {
            family: 'Arial',
            size: 20,
            weight: 'bold',
          },
          color: COLORS.black,
        },
      },
    },
  };

  const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}
