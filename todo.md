# SocialDash Dashboard - TODO

## Pages
- [x] Overview page with month selection (default: current month)
- [x] Facebook KPI overview page with top posts and tables
- [x] Posts list page with filters (month, type) and sorting (interactions, reach)
- [x] Exports page for CSV export (monthly)

## API Routes
- [x] GET /api/facebook/monthly - Monthly aggregated stats (via tRPC)
- [x] GET /api/facebook/posts - Posts with filters and sorting (via tRPC)
- [x] GET /api/health - Health check endpoint (via tRPC)

## Database
- [x] External PostgreSQL connection (Supabase) - via FACEBOOK_DATABASE_URL
- [x] Query helpers for Facebook data

## Design
- [x] Data Observatory dark theme with cyan accents
- [x] Sidebar navigation
- [x] KPI cards (sparklines pending data)
- [x] Responsive layout

## KPI Definitions
- [x] Interactions = reactions + comments (NOT shares)
- [x] Shares displayed separately with "Limited" label
- [x] Saves NOT displayed (not available)
- [x] Reach/Impressions from cached post insights

## PPTX Report Generation (Task 2)
- [x] Extend database schema for Instagram (ig_posts, ig_post_metrics, ig_accounts)
- [x] Create Instagram views (view_ig_monthly_post_metrics, view_ig_monthly_account_stats)
- [x] Implement PPTX generator with python-pptx (collector) and pptxgenjs (dashboard)
- [x] Create report slides: Cover, FB KPIs, FB Top Posts, FB Videos, Fazit, Contact
- [x] Implement thumbnail handling (media_url from DB or OpenGraph fallback)
- [x] Create report generation API endpoint (tRPC reports.generate)
- [x] Test report generation with unit tests (7 tests passing)

## Media URL Caching (Task 3)
- [x] Extend fb_posts table with media_url, thumbnail_url, og_image_url, preview_source
- [x] Extend ig_posts table with media_url, thumbnail_url, preview_source
- [x] Create migration 004_media_urls.sql
- [x] Implement Graph API attachment fetching for FB posts
- [x] Implement OpenGraph fallback for thumbnail extraction
- [x] Implement IG media_url/thumbnail_url fetching
- [ ] Optional: Implement storage caching for thumbnails (Supabase Storage)
- [x] Update collector logging for preview statistics

## Supabase Setup (Completed)
- [x] Created Supabase project (gbjqrnoewwstnyuxflab)
- [x] Executed migration 001_init.sql (fb_pages, fb_posts, fb_post_metrics, fb_monthly_post_summary)
- [x] Executed migration 002_views.sql (view_fb_post_latest_metrics, view_fb_monthly_post_metrics)
- [x] Executed migration 003_instagram.sql (ig_accounts, ig_posts, ig_post_metrics, ig_monthly_post_summary)
- [x] Executed migration 004_media_urls.sql (media_url, thumbnail_url columns)
- [x] Configured FACEBOOK_DATABASE_URL in dashboard
- [x] Verified database connection (12 tests passing)
