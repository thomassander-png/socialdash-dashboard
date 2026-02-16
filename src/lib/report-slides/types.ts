import PptxGenJS from 'pptxgenjs';

// ============================================
// SHARED TYPES & DESIGN CONSTANTS
// For modular report slide generation
// ============================================

// Agency Configuration
export const AGENCY = {
  name: 'famefact',
  tagline: 'FIRST IN SOCIALTAINMENT',
  metaPartner: 'Offizieller Meta Business Partner',
  logoPath: '/assets/famefact-logo.png',
  colors: {
    primary: '84CC16',
    secondary: 'A855F7',
    green: 'A8D65C',
    purple: 'B8A9C9',
  },
  contact: {
    name: 'Sophie Rettig',
    title: 'Social Media Managerin',
    company: 'track by track GmbH',
    address: 'Schliemannstraße 23',
    city: 'D-10437 Berlin',
    email: 'sophie.rettig@famefact.com',
    phone: '+49 157 51639979',
  }
};

// Design Configuration
export const DESIGN = {
  fontFamily: 'Inter',
  fontFamilyFallback: 'Arial',
  margin: 0.5,
  colors: {
    background: 'F9F9F9',
    white: 'FFFFFF',
    black: '000000',
    gray: '666666',
    lightGray: 'F5F5F5',
    darkGray: '333333',
    mediumGray: '999999',
    shadow: 'E0E0E0',
    trendUp: '22C55E',
    trendDown: 'EF4444',
    trendNeutral: 'EAB308',
    lightBlue: '7DD3E1',
    darkBlue: '2B7A8C',
  }
};

// Customer data interface
export interface CustomerData {
  customer_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  is_active: boolean;
}

// Post data interface
export interface PostData {
  post_id: string;
  message: string;
  created_time: Date;
  type: string;
  permalink: string;
  reactions_total: number;
  comments_total: number;
  shares_total: number | null;
  reach: number | null;
  impressions: number | null;
  video_3s_views: number | null;
  thumbnail_url?: string;
  saves?: number | null;
}

// Monthly KPI interface
export interface MonthlyKPI {
  month: string;
  posts_count: number;
  total_reactions: number;
  total_comments: number;
  total_shares: number;
  total_reach: number;
  total_impressions: number;
  total_video_views: number;
  total_saves: number;
  avg_reach: number;
  engagement_rate: number;
  followers: number;
  new_followers: number;
}

// Monthly Ad Data interface
export interface MonthlyAdData {
  month: string;
  campaigns: any[];
  fbCampaigns: any[];
  igCampaigns: any[];
  totalSpend: number;
  fbSpend: number;
  igSpend: number;
  totalImpressions: number;
  fbImpressions: number;
  igImpressions: number;
  totalReach: number;
  fbReach: number;
  igReach: number;
  totalClicks: number;
  fbClicks: number;
  igClicks: number;
  totalEngagement: number;
  fbEngagement: number;
  igEngagement: number;
  totalVideoViews: number;
  fbVideoViews: number;
  igVideoViews: number;
  totalLinkClicks: number;
  fbLinkClicks: number;
  igLinkClicks: number;
}

// Context passed to every slide generator
export interface SlideContext {
  pptx: PptxGenJS;
  customer: CustomerData;
  month: string;
  months: string[]; // [2 months ago, 1 month ago, current month]
  primaryColor: string;
  secondaryColor: string;
  fbPosts: PostData[];
  igPosts: PostData[];
  fbKpis: MonthlyKPI[];
  igKpis: MonthlyKPI[];
  monthlyAdsData: MonthlyAdData[];
  pageNumber: number; // auto-incremented
  config: ReportConfig;
}

// Report Configuration (matches the UI config)
export interface ReportConfig {
  platforms: {
    facebook: boolean;
    instagram: boolean;
    ads: boolean;
    tiktok: boolean;
    linkedin: boolean;
  };
  slides: Record<string, boolean>;
  kpis: Record<string, boolean>;
  notes: string;
}

// Default report config
export const DEFAULT_REPORT_CONFIG: ReportConfig = {
  platforms: { facebook: true, instagram: true, ads: true, tiktok: false, linkedin: false },
  slides: {
    cover: true,
    executiveSummary: true,
    fbDivider: false,
    fbKennzahlen: true,
    fbTopPosts: true,
    fbVideos: true,
    fbPpas: true,
    fbEinzelkampagnen: false,
    fbDemographie: true,
    igDivider: false,
    igKennzahlen: true,
    igTopPosts: true,
    igReels: true,
    igPpas: true,
    igReelsDetail: false,
    igStorys: false,
    adsCampaigns: true,
    zusammenfassung: true,
    glossar: false,
    kontakt: true,
    // Future: TikTok slides
    tiktokDivider: false,
    tiktokKennzahlen: false,
    tiktokChart: false,
    tiktokUebersicht: false,
    tiktokPpas: false,
    tiktokFollowerCampaign: false,
    // Future: LinkedIn slides
    linkedinDivider: false,
    linkedinKennzahlen: false,
    linkedinPosts: false,
    // Future: Cross-platform
    btsCampaign: false,
  },
  kpis: {
    reach: true,
    impressions: true,
    engagement: true,
    engagementRate: true,
    followerGrowth: true,
    videoViews: false,
    linkClicks: false,
    saves: true,
    shares: true,
    adSpend: true,
    cpc: true,
    cpm: true,
    ctr: true,
    frequency: false,
  },
  notes: '',
};

// Slide Module Definition
export interface SlideModule {
  id: string;
  name: string;
  description: string;
  platform: 'general' | 'facebook' | 'instagram' | 'ads' | 'tiktok' | 'linkedin' | 'cross-platform';
  category: 'cover' | 'divider' | 'kpi' | 'content' | 'ads' | 'summary' | 'contact';
  order: number; // default sort order
  generate: (ctx: SlideContext) => void;
}
