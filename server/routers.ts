import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  getPages,
  getMonthlyStats,
  getMonthlyPosts,
  getTopPosts,
  getMonthlyKPIs,
  getAvailableMonths,
  checkDatabaseHealth,
} from "./facebook-db";
import { generateReport } from "./report-generator";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Facebook data routes
  facebook: router({
    // Get all tracked pages
    pages: publicProcedure.query(async () => {
      return getPages();
    }),

    // Get available months with data
    availableMonths: publicProcedure.query(async () => {
      return getAvailableMonths();
    }),

    // Get monthly KPIs (aggregated across all pages)
    monthlyKPIs: publicProcedure
      .input(z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM format")
      }))
      .query(async ({ input }) => {
        return getMonthlyKPIs(input.month);
      }),

    // Get monthly stats per page
    monthlyStats: publicProcedure
      .input(z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM format")
      }))
      .query(async ({ input }) => {
        return getMonthlyStats(input.month);
      }),

    // Get posts with filters and sorting
    posts: publicProcedure
      .input(z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM format"),
        pageId: z.string().optional(),
        postType: z.string().optional(),
        sortBy: z.enum(['interactions', 'reach', 'date']).default('interactions'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        return getMonthlyPosts(input.month, {
          pageId: input.pageId,
          postType: input.postType,
          sortBy: input.sortBy,
          sortOrder: input.sortOrder,
          limit: input.limit,
          offset: input.offset,
        });
      }),

    // Get top posts for a month
    topPosts: publicProcedure
      .input(z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM format"),
        limit: z.number().min(1).max(20).default(5),
      }))
      .query(async ({ input }) => {
        return getTopPosts(input.month, input.limit);
      }),
  }),

  // Report generation
  reports: router({
    // Generate PPTX report
    generate: publicProcedure
      .input(z.object({
        clientName: z.string().min(1, "Client name is required"),
        month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM format"),
      }))
      .mutation(async ({ input }) => {
        try {
          const pptxBuffer = await generateReport({
            clientName: input.clientName,
            reportMonth: input.month,
          });
          
          // Convert buffer to base64 for transmission
          const base64 = pptxBuffer.toString('base64');
          
          return {
            success: true,
            filename: `report_${input.clientName.toLowerCase().replace(/\s+/g, '_')}_${input.month}.pptx`,
            data: base64,
            mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          };
        } catch (error: any) {
          console.error('Report generation failed:', error);
          return {
            success: false,
            error: error.message || 'Report generation failed',
          };
        }
      }),
  }),

  // Health check
  health: publicProcedure.query(async () => {
    const dbHealth = await checkDatabaseHealth();
    return {
      status: dbHealth.connected && dbHealth.tablesExist ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: dbHealth,
    };
  }),
});

export type AppRouter = typeof appRouter;
