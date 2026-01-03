import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean, bigint, datetime } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================
// FACEBOOK TABLES
// ============================================

export const fbPages = mysqlTable("fb_pages", {
  pageId: varchar("page_id", { length: 64 }).primaryKey(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const fbPosts = mysqlTable("fb_posts", {
  postId: varchar("post_id", { length: 128 }).primaryKey(),
  pageId: varchar("page_id", { length: 64 }).notNull(),
  createdTime: datetime("created_time").notNull(),
  type: varchar("type", { length: 32 }),
  permalink: text("permalink"),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const fbPostMetrics = mysqlTable("fb_post_metrics", {
  id: int("id").autoincrement().primaryKey(),
  postId: varchar("post_id", { length: 128 }).notNull(),
  snapshotTime: datetime("snapshot_time").notNull(),
  reactionsTotal: int("reactions_total").default(0),
  commentsTotal: int("comments_total").default(0),
  sharesTotal: int("shares_total"),
  reach: int("reach"),
  impressions: int("impressions"),
  video3sViews: int("video_3s_views"),
  sharesLimited: boolean("shares_limited").default(true),
  rawJson: json("raw_json"),
});

// ============================================
// INSTAGRAM TABLES
// ============================================

export const igAccounts = mysqlTable("ig_accounts", {
  accountId: varchar("account_id", { length: 64 }).primaryKey(),
  username: varchar("username", { length: 128 }),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const igPosts = mysqlTable("ig_posts", {
  postId: varchar("post_id", { length: 64 }).primaryKey(),
  accountId: varchar("account_id", { length: 64 }).notNull(),
  createdTime: datetime("created_time").notNull(),
  mediaType: varchar("media_type", { length: 32 }),
  permalink: text("permalink"),
  caption: text("caption"),
  mediaUrl: text("media_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const igPostMetrics = mysqlTable("ig_post_metrics", {
  id: int("id").autoincrement().primaryKey(),
  postId: varchar("post_id", { length: 64 }).notNull(),
  snapshotTime: datetime("snapshot_time").notNull(),
  likesCount: int("likes_count").default(0),
  commentsCount: int("comments_count").default(0),
  reach: int("reach"),
  impressions: int("impressions"),
  saved: int("saved"),
  rawJson: json("raw_json"),
});

// ============================================
// CUSTOMER & REPORTING TABLES
// ============================================

export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  logoUrl: text("logo_url"),
  primaryColor: varchar("primary_color", { length: 16 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customerAccounts = mysqlTable("customer_accounts", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customer_id").notNull(),
  platform: mysqlEnum("platform", ["facebook", "instagram"]).notNull(),
  accountId: varchar("account_id", { length: 64 }).notNull(),
  accountName: varchar("account_name", { length: 256 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customer_id").notNull(),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM format
  reportType: mysqlEnum("report_type", ["monthly", "quarterly", "annual"]).default("monthly"),
  status: mysqlEnum("status", ["pending", "generated", "sent"]).default("pending"),
  fileUrl: text("file_url"),
  generatedAt: datetime("generated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Type exports
export type FbPage = typeof fbPages.$inferSelect;
export type FbPost = typeof fbPosts.$inferSelect;
export type FbPostMetric = typeof fbPostMetrics.$inferSelect;
export type IgAccount = typeof igAccounts.$inferSelect;
export type IgPost = typeof igPosts.$inferSelect;
export type IgPostMetric = typeof igPostMetrics.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type CustomerAccount = typeof customerAccounts.$inferSelect;
export type Report = typeof reports.$inferSelect;
