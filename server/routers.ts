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
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerAccounts,
  assignAccountToCustomer,
  toggleAccountActive,
  getReports,
  getReport,
  createReport,
  updateReport,
  isUserAdmin,
} from "./admin-db";

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

  // Admin routes
  admin: router({
    // Check if current user is admin
    isAdmin: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return false;
      return isUserAdmin(ctx.user.openId);
    }),

    // Customer management
    customers: router({
      list: publicProcedure
        .input(z.object({ activeOnly: z.boolean().default(false) }).optional())
        .query(async ({ input }) => {
          return getCustomers(input?.activeOnly ?? false);
        }),

      get: publicProcedure
        .input(z.object({ customerId: z.string().uuid() }))
        .query(async ({ input }) => {
          return getCustomer(input.customerId);
        }),

      create: publicProcedure
        .input(z.object({ name: z.string().min(1, "Name is required") }))
        .mutation(async ({ input }) => {
          return createCustomer(input.name);
        }),

      update: publicProcedure
        .input(z.object({
          customerId: z.string().uuid(),
          name: z.string().min(1).optional(),
          isActive: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
          return updateCustomer(input.customerId, {
            name: input.name,
            is_active: input.isActive,
          });
        }),

      delete: publicProcedure
        .input(z.object({ customerId: z.string().uuid() }))
        .mutation(async ({ input }) => {
          return deleteCustomer(input.customerId);
        }),
    }),

    // Account management
    accounts: router({
      list: publicProcedure
        .input(z.object({
          customerId: z.string().uuid().optional(),
          platform: z.enum(['facebook', 'instagram']).optional(),
          unassignedOnly: z.boolean().default(false),
        }).optional())
        .query(async ({ input }) => {
          return getCustomerAccounts({
            customerId: input?.customerId,
            platform: input?.platform,
            unassignedOnly: input?.unassignedOnly ?? false,
          });
        }),

      assign: publicProcedure
        .input(z.object({
          accountId: z.string(),
          platform: z.enum(['facebook', 'instagram']),
          customerId: z.string().uuid().nullable(),
        }))
        .mutation(async ({ input }) => {
          return assignAccountToCustomer(input.accountId, input.platform, input.customerId);
        }),

      toggleActive: publicProcedure
        .input(z.object({
          accountId: z.string(),
          platform: z.enum(['facebook', 'instagram']),
          isActive: z.boolean(),
        }))
        .mutation(async ({ input }) => {
          return toggleAccountActive(input.accountId, input.platform, input.isActive);
        }),
    }),

    // Report management
    reports: router({
      list: publicProcedure
        .input(z.object({
          customerId: z.string().uuid().optional(),
          month: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/).optional(),
          status: z.enum(['pending', 'generating', 'generated', 'failed']).optional(),
        }).optional())
        .query(async ({ input }) => {
          return getReports({
            customerId: input?.customerId,
            month: input?.month,
            status: input?.status,
          });
        }),

      get: publicProcedure
        .input(z.object({ reportId: z.string().uuid() }))
        .query(async ({ input }) => {
          return getReport(input.reportId);
        }),

      create: publicProcedure
        .input(z.object({
          customerId: z.string().uuid(),
          month: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, "Month must be YYYY-MM format"),
        }))
        .mutation(async ({ input }) => {
          return createReport(input.customerId, input.month);
        }),

      regenerate: publicProcedure
        .input(z.object({ reportId: z.string().uuid() }))
        .mutation(async ({ input }) => {
          // Get the report details
          const report = await getReport(input.reportId);
          if (!report) {
            throw new Error("Report not found");
          }

          // Update status to generating
          await updateReport(input.reportId, { status: 'generating' });

          try {
            // Generate the report
            const monthStr = new Date(report.month).toISOString().slice(0, 7);
            const pptxBuffer = await generateReport({
              clientName: report.customer_name || 'Unknown',
              reportMonth: monthStr,
            });

            // For now, return the base64 data
            // In production, this would upload to Supabase Storage
            const base64 = pptxBuffer.toString('base64');
            
            await updateReport(input.reportId, {
              status: 'generated',
              meta: { size: pptxBuffer.length },
            });

            return {
              success: true,
              reportId: input.reportId,
              data: base64,
              filename: `report_${report.customer_name?.toLowerCase().replace(/\s+/g, '_')}_${monthStr}.pptx`,
            };
          } catch (error: any) {
            await updateReport(input.reportId, {
              status: 'failed',
              error_message: error.message,
            });
            throw error;
          }
        }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
