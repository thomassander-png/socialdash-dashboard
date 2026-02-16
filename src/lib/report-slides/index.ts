// ============================================
// SLIDE REGISTRY
// Central registry of all available slide modules
// ============================================

import { SlideModule, SlideContext, ReportConfig, DEFAULT_REPORT_CONFIG } from './types';

// Import all slide modules
import { slideCover } from './slide-cover';
import { slideExecutiveSummary } from './slide-executive-summary';
import { slideFbDivider, slideIgDivider, slideTiktokDivider, slideLinkedinDivider } from './slide-divider';
import { slideFbKennzahlen } from './slide-fb-kennzahlen';
import { slideFbTopPosts } from './slide-fb-top-posts';
import { slideFbVideos } from './slide-fb-videos';
import { slideFbPpas } from './slide-fb-ppas';
import { slideFbEinzelkampagnen } from './slide-fb-einzelkampagnen';
import { slideFbDemographie } from './slide-fb-demographie';
import { slideIgKennzahlen } from './slide-ig-kennzahlen';
import { slideIgTopPosts } from './slide-ig-top-posts';
import { slideIgReels } from './slide-ig-reels';
import { slideIgPpas } from './slide-ig-ppas';
import { slideAdsCampaigns } from './slide-ads-campaigns';
import { slideZusammenfassung } from './slide-zusammenfassung';
import { slideGlossar } from './slide-glossar';
import { slideKontakt } from './slide-kontakt';

// Master registry of all available slides
export const SLIDE_REGISTRY: SlideModule[] = [
  slideCover,
  slideExecutiveSummary,
  slideFbDivider,
  slideFbKennzahlen,
  slideFbTopPosts,
  slideFbVideos,
  slideFbPpas,
  slideFbEinzelkampagnen,
  slideFbDemographie,
  slideIgDivider,
  slideIgKennzahlen,
  slideIgTopPosts,
  slideIgReels,
  slideIgPpas,
  slideAdsCampaigns,
  slideZusammenfassung,
  slideGlossar,
  slideKontakt,
  // Future: TikTok slides
  slideTiktokDivider,
  // Future: LinkedIn slides
  slideLinkedinDivider,
];

// Get slide by ID
export function getSlideById(id: string): SlideModule | undefined {
  return SLIDE_REGISTRY.find(s => s.id === id);
}

// Get all slides for a platform
export function getSlidesByPlatform(platform: string): SlideModule[] {
  return SLIDE_REGISTRY.filter(s => s.platform === platform || s.platform === 'general');
}

// Platform to slide mapping: which slides require which platform
const PLATFORM_SLIDE_MAP: Record<string, string> = {
  fbDivider: 'facebook',
  fbKennzahlen: 'facebook',
  fbTopPosts: 'facebook',
  fbVideos: 'facebook',
  fbPpas: 'facebook',
  fbEinzelkampagnen: 'facebook',
  fbDemographie: 'facebook',
  igDivider: 'instagram',
  igKennzahlen: 'instagram',
  igTopPosts: 'instagram',
  igReels: 'instagram',
  igPpas: 'instagram',
  adsCampaigns: 'ads',
  tiktokDivider: 'tiktok',
  tiktokKennzahlen: 'tiktok',
  tiktokChart: 'tiktok',
  tiktokUebersicht: 'tiktok',
  tiktokPpas: 'tiktok',
  tiktokFollowerCampaign: 'tiktok',
  linkedinDivider: 'linkedin',
  linkedinKennzahlen: 'linkedin',
  linkedinPosts: 'linkedin',
};

/**
 * Build the ordered list of slides to generate based on customer config.
 * Filters by:
 * 1. Platform enabled
 * 2. Slide enabled in config
 * 3. Sorted by order
 */
export function buildSlideList(config: ReportConfig): SlideModule[] {
  const enabledSlides: SlideModule[] = [];

  for (const slide of SLIDE_REGISTRY) {
    // Check if slide is enabled in config
    if (config.slides[slide.id] === false) continue;
    // If slide is not in config at all, use default
    if (config.slides[slide.id] === undefined) {
      const defaultVal = DEFAULT_REPORT_CONFIG.slides[slide.id];
      if (defaultVal === false) continue;
    }

    // Check if platform is enabled
    const requiredPlatform = PLATFORM_SLIDE_MAP[slide.id];
    if (requiredPlatform) {
      const platformKey = requiredPlatform as keyof ReportConfig['platforms'];
      if (!config.platforms[platformKey]) continue;
    }

    enabledSlides.push(slide);
  }

  // Sort by order
  return enabledSlides.sort((a, b) => a.order - b.order);
}

/**
 * Generate all slides based on config.
 * Returns the number of slides generated.
 */
export function generateReport(ctx: SlideContext): number {
  const slides = buildSlideList(ctx.config);
  let pageNum = 1;

  for (const slide of slides) {
    ctx.pageNumber = pageNum;
    try {
      slide.generate(ctx);
      pageNum++;
    } catch (error) {
      console.error(`Error generating slide ${slide.id}:`, error);
      // Continue with next slide
    }
  }

  return pageNum - 1;
}

// Re-export types
export type { SlideModule, SlideContext, ReportConfig } from './types';
export { DEFAULT_REPORT_CONFIG, AGENCY, DESIGN } from './types';
