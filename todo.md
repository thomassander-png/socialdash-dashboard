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
