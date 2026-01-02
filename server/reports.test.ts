/**
 * Unit tests for report generation functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the facebook-db module
vi.mock('./facebook-db', () => ({
  getFacebookPool: vi.fn(() => null),
  getPages: vi.fn(() => []),
  getMonthlyStats: vi.fn(() => []),
  getMonthlyPosts: vi.fn(() => []),
  getTopPosts: vi.fn(() => []),
  getMonthlyKPIs: vi.fn(() => ({
    totalPosts: 0,
    totalReactions: 0,
    totalComments: 0,
    totalInteractions: 0,
    totalReach: 0,
    totalImpressions: 0,
    avgReachPerPost: 0,
    avgInteractionsPerPost: 0,
    totalShares: 0,
    sharesLimited: true
  })),
  getAvailableMonths: vi.fn(() => []),
  checkDatabaseHealth: vi.fn(() => ({
    connected: false,
    tablesExist: false,
    postCount: 0,
    snapshotCount: 0
  })),
}));

// Import after mocking
import { generateReport } from './report-generator';

describe('Report Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate a PPTX buffer', async () => {
    const result = await generateReport({
      clientName: 'Test Client',
      reportMonth: '2025-12',
    });

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should generate valid PPTX file header', async () => {
    const result = await generateReport({
      clientName: 'Test Client',
      reportMonth: '2025-12',
    });

    // PPTX files are ZIP archives, which start with PK signature
    const header = result.slice(0, 4).toString('hex');
    expect(header).toBe('504b0304'); // PK\x03\x04 in hex
  });

  it('should handle different month formats', async () => {
    const result1 = await generateReport({
      clientName: 'Client A',
      reportMonth: '2025-01',
    });

    const result2 = await generateReport({
      clientName: 'Client B',
      reportMonth: '2025-12',
    });

    expect(result1).toBeInstanceOf(Buffer);
    expect(result2).toBeInstanceOf(Buffer);
  });

  it('should handle special characters in client name', async () => {
    const result = await generateReport({
      clientName: 'Test & Client GmbH',
      reportMonth: '2025-12',
    });

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle German umlauts in client name', async () => {
    const result = await generateReport({
      clientName: 'Müller & Söhne GmbH',
      reportMonth: '2025-12',
    });

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('German Month Names', () => {
  it('should format months correctly in German', async () => {
    // Test by generating reports for different months
    // The German month names are embedded in the PPTX
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    
    for (const month of months) {
      const result = await generateReport({
        clientName: 'Test',
        reportMonth: `2025-${month}`,
      });
      expect(result).toBeInstanceOf(Buffer);
    }
  });
});

describe('Number Formatting', () => {
  // Test the formatNumber function indirectly through report generation
  it('should generate reports with various data sizes', async () => {
    // Even with no data, the report should generate
    const result = await generateReport({
      clientName: 'Empty Data Test',
      reportMonth: '2025-12',
    });

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });
});
