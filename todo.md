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

## GitHub Configuration (Completed)
- [x] Configure GitHub Secrets (META_ACCESS_TOKEN, FB_PAGE_IDS, DATABASE_URL, META_API_VERSION, TZ)
- [x] Add GitHub Actions workflow file (.github/workflows/cache_meta.yml)
- [x] Trigger first cache run via workflow_dispatch
- [x] Verify data in Supabase database (2 posts, 2 metrics)
- [x] Verify data displays in dashboard (Februar 2025 shows correctly)


## Admin UI & Automated Reports (Task 4) - COMPLETED

### Database Migrations
- [x] Create customers table (customer_id, name, is_active, created_at)
- [x] Create customer_accounts table (id, customer_id, platform, account_id, account_name, is_active)
- [x] Create reports table (report_id, customer_id, month, status, pptx_url, pdf_url, generated_at, meta)

### Automatic Account Discovery (Collector)
- [x] Implement /me/accounts discovery for all FB Pages
- [x] Implement instagram_business_account discovery for IG accounts
- [x] Auto-create customer_accounts entries with customer_id=NULL

### Admin UI Pages
- [x] Add Admin navigation menu item (only for admin users)
- [x] /admin/customers - Customer management (create, activate/deactivate, delete)
- [x] /admin/accounts - Account assignment (dropdown to assign accounts to customers)
- [x] /admin/reports - Report overview (status, regenerate, download)

### Report Generation
- [x] Implement customer-based report generator
- [x] Include FB KPIs + Top Posts with images
- [x] Include FB Videos (3s views)
- [ ] Include IG KPIs + Top Posts (Likes, Comments, Saves) - pending IG data
- [ ] Include IG Reels (Plays) - pending IG data
- [x] Auto-generate Fazit per channel
- [ ] Store reports in Supabase Storage - optional
### Automation
- [x] Create monthly GitHub Actions workflow (3rd of month, 06:00 UTC) - needs manual upload
- [x] Generate reports for all active customers (generate_reports mode)
- [x] Save to reports/ directory with customer name and month
