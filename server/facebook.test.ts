import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the facebook-db module
vi.mock("./facebook-db", () => ({
  getPages: vi.fn(),
  getMonthlyStats: vi.fn(),
  getMonthlyPosts: vi.fn(),
  getTopPosts: vi.fn(),
  getMonthlyKPIs: vi.fn(),
  getAvailableMonths: vi.fn(),
  checkDatabaseHealth: vi.fn(),
}));

import * as facebookDb from "./facebook-db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("facebook.pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns list of Facebook pages", async () => {
    const mockPages = [
      { page_id: "123", name: "Test Page", created_at: new Date() },
      { page_id: "456", name: "Another Page", created_at: new Date() },
    ];
    vi.mocked(facebookDb.getPages).mockResolvedValue(mockPages);

    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.facebook.pages();

    expect(result).toEqual(mockPages);
    expect(facebookDb.getPages).toHaveBeenCalledOnce();
  });

  it("returns empty array when no pages exist", async () => {
    vi.mocked(facebookDb.getPages).mockResolvedValue([]);

    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.facebook.pages();

    expect(result).toEqual([]);
  });
});

describe("facebook.availableMonths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns list of available months", async () => {
    const mockMonths = ["2025-12", "2025-11", "2025-10"];
    vi.mocked(facebookDb.getAvailableMonths).mockResolvedValue(mockMonths);

    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.facebook.availableMonths();

    expect(result).toEqual(mockMonths);
    expect(facebookDb.getAvailableMonths).toHaveBeenCalledOnce();
  });
});

describe("facebook.monthlyKPIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns KPIs for valid month format", async () => {
    const mockKPIs = {
      totalPosts: 25,
      totalReactions: 1500,
      totalComments: 200,
      totalInteractions: 1700,
      totalReach: 50000,
      totalImpressions: 75000,
      avgReachPerPost: 2000,
      avgInteractionsPerPost: 68,
      totalShares: 100,
      sharesLimited: true,
    };
    vi.mocked(facebookDb.getMonthlyKPIs).mockResolvedValue(mockKPIs);

    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.facebook.monthlyKPIs({ month: "2025-12" });

    expect(result).toEqual(mockKPIs);
    expect(facebookDb.getMonthlyKPIs).toHaveBeenCalledWith("2025-12");
  });

  it("rejects invalid month format", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.facebook.monthlyKPIs({ month: "invalid" })
    ).rejects.toThrow();

    await expect(
      caller.facebook.monthlyKPIs({ month: "2025-1" })
    ).rejects.toThrow();

    await expect(
      caller.facebook.monthlyKPIs({ month: "12-2025" })
    ).rejects.toThrow();
  });
});

describe("facebook.posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns posts with default parameters", async () => {
    const mockPosts = [
      {
        post_id: "post1",
        page_id: "123",
        post_created_time: new Date(),
        post_type: "photo",
        permalink: "https://facebook.com/post1",
        message: "Test post",
        snapshot_time: new Date(),
        reactions_total: 100,
        comments_total: 20,
        shares_total: 10,
        reach: 5000,
        impressions: 7000,
        video_3s_views: null,
        shares_limited: true,
        interactions_total: 120,
      },
    ];
    vi.mocked(facebookDb.getMonthlyPosts).mockResolvedValue(mockPosts);

    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.facebook.posts({ month: "2025-12" });

    expect(result).toEqual(mockPosts);
    expect(facebookDb.getMonthlyPosts).toHaveBeenCalledWith("2025-12", {
      pageId: undefined,
      postType: undefined,
      sortBy: "interactions",
      sortOrder: "desc",
      limit: 50,
      offset: 0,
    });
  });

  it("passes filter parameters correctly", async () => {
    vi.mocked(facebookDb.getMonthlyPosts).mockResolvedValue([]);

    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await caller.facebook.posts({
      month: "2025-12",
      pageId: "123",
      postType: "video",
      sortBy: "reach",
      sortOrder: "asc",
      limit: 20,
      offset: 10,
    });

    expect(facebookDb.getMonthlyPosts).toHaveBeenCalledWith("2025-12", {
      pageId: "123",
      postType: "video",
      sortBy: "reach",
      sortOrder: "asc",
      limit: 20,
      offset: 10,
    });
  });
});

describe("facebook.topPosts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns top posts with default limit", async () => {
    const mockPosts = [
      {
        post_id: "top1",
        page_id: "123",
        post_created_time: new Date(),
        post_type: "photo",
        permalink: null,
        message: "Top post",
        snapshot_time: new Date(),
        reactions_total: 500,
        comments_total: 100,
        shares_total: null,
        reach: 20000,
        impressions: 30000,
        video_3s_views: null,
        shares_limited: true,
        interactions_total: 600,
      },
    ];
    vi.mocked(facebookDb.getTopPosts).mockResolvedValue(mockPosts);

    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.facebook.topPosts({ month: "2025-12" });

    expect(result).toEqual(mockPosts);
    expect(facebookDb.getTopPosts).toHaveBeenCalledWith("2025-12", 5);
  });

  it("respects custom limit", async () => {
    vi.mocked(facebookDb.getTopPosts).mockResolvedValue([]);

    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await caller.facebook.topPosts({ month: "2025-12", limit: 10 });

    expect(facebookDb.getTopPosts).toHaveBeenCalledWith("2025-12", 10);
  });
});

describe("health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok status when database is healthy", async () => {
    vi.mocked(facebookDb.checkDatabaseHealth).mockResolvedValue({
      connected: true,
      tablesExist: true,
      postCount: 100,
      snapshotCount: 500,
    });

    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.health();

    expect(result.status).toBe("ok");
    expect(result.database.connected).toBe(true);
    expect(result.database.tablesExist).toBe(true);
    expect(result.timestamp).toBeDefined();
  });

  it("returns degraded status when database is not connected", async () => {
    vi.mocked(facebookDb.checkDatabaseHealth).mockResolvedValue({
      connected: false,
      tablesExist: false,
      postCount: 0,
      snapshotCount: 0,
      error: "Connection failed",
    });

    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.health();

    expect(result.status).toBe("degraded");
    expect(result.database.connected).toBe(false);
  });

  it("returns degraded status when tables do not exist", async () => {
    vi.mocked(facebookDb.checkDatabaseHealth).mockResolvedValue({
      connected: true,
      tablesExist: false,
      postCount: 0,
      snapshotCount: 0,
      error: "Tables not found",
    });

    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.health();

    expect(result.status).toBe("degraded");
    expect(result.database.tablesExist).toBe(false);
  });
});
