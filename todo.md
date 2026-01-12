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


## Final Setup Tasks (Task 5)
- [ ] Add GitHub Actions workflow for monthly reports (generate_reports.yml)
- [ ] Cache Instagram data from Graph API
- [ ] Create additional customers and assign accounts
- [ ] Test complete system end-to-end


## Customer Seeding & Account Discovery (Task 6)

### A) DB: Seed/Import für Kunden
- [x] Create seed_customers.json with all customer data
- [x] Implement seed-runner script (upsert customers by slug)
- [ ] Execute seed to populate customers table

### B) Collector: Accounts automatisch discovern
- [x] Verify discover mode in collector fetches all FB Pages via /me/accounts
- [x] Verify discover mode fetches instagram_business_account for each page
- [x] Verify accounts are upserted to customer_accounts with customer_id=NULL

### C) Admin UI: Account-Zuordnung
- [x] Verify /admin/customers shows all seeded customers (with seed button)
- [x] Verify /admin/accounts shows all discovered accounts
- [x] Verify dropdown allows manual assignment of accounts to customers


## Instagram Insights Design Fix (Task 7)
- [x] Fix Instagram Insights page design at /instagram-insights
- [x] Create Instagram page with famefact design (lime green primary)
- [x] Add Instagram to sidebar navigation
- [x] Create Instagram tRPC routes and database helpers


## Report Generator Enhancement (Task 8)
- [ ] Verbesserte Report-Seite mit Kundenauswahl-Dropdown
- [ ] Report-Generator mit Post-Bildern aus Supabase Storage
- [ ] Kundenspezifische Reports (nur zugewiesene Accounts)
- [ ] Automatische Bild-Integration in PPTX
- [ ] PDF-Export Option hinzufügen


## Visualisierungs-Bibliotheken Upgrade (Task 9)

### Recherche & Evaluierung
- [x] Recherche aller Chart-Bibliotheken (Recharts, Tremor, Chart.js, ApexCharts, Nivo, etc.)
- [x] Bewertungsmatrix mit Scores erstellen (Visuelle Qualität, Anpassbarkeit, Performance, Doku)
- [x] Beste Dashboard-Lösung auswählen (shadcn/ui Charts + Tremor)

### Dashboard Implementierung
- [x] KPI-Karten mit Trend-Pfeilen und Sparklines (kpi-card.tsx)
- [x] Balkendiagramm mit Bildern über Balken (premium-bar-chart.tsx)
- [x] Tabelle mit eingebetteten Thumbnails (premium-table.tsx)
- [x] Line Chart für Trends (premium-line-chart.tsx)
- [x] Demo-Seite erstellen (/demo/visualizations)

### PPTX Reports
- [x] PPTX Report Generator mit Premium Design aktualisieren
- [x] Native PowerPoint Charts integriert (Bar Charts)
- [x] Premium KPI-Karten Layout implementiert

### Dokumentation
- [x] Vorher/Nachher Screenshots (docs/screenshots/)
- [x] Dokumentation der Nutzung (docs/VISUALIZATIONS.md)
