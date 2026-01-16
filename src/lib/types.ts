export interface Customer {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  created_at: Date;
}

export interface CustomerAccount {
  id: number;
  customer_id: number;
  platform: 'facebook' | 'instagram';
  account_id: string;
  account_name: string | null;
  created_at: Date;
}

export interface FbPage {
  page_id: string;
  name: string | null;
  created_at: Date;
}

export interface FbPost {
  post_id: string;
  page_id: string;
  created_time: Date;
  type: string | null;
  permalink: string | null;
  message: string | null;
  created_at: Date;
}

export interface FbPostMetrics {
  id: number;
  post_id: string;
  snapshot_time: Date;
  reactions_total: number;
  comments_total: number;
  shares_total: number | null;
  reach: number | null;
  impressions: number | null;
  video_3s_views: number | null;
  shares_limited: boolean;
  raw_json: unknown;
}

export interface IgAccount {
  account_id: string;
  username: string | null;
  name: string | null;
  created_at: Date;
}

export interface IgPost {
  post_id: string;
  account_id: string;
  created_time: Date;
  media_type: string | null;
  permalink: string | null;
  caption: string | null;
  media_url: string | null;
  created_at: Date;
}

export interface IgPostMetrics {
  id: number;
  post_id: string;
  snapshot_time: Date;
  likes_count: number;
  comments_count: number;
  reach: number | null;
  impressions: number | null;
  saved: number | null;
  raw_json: unknown;
}

export interface FollowerHistory {
  id: number;
  page_id?: string;
  account_id?: string;
  snapshot_date: Date;
  follower_count: number;
  created_at: Date;
}

export interface MonthlyFollowerGrowth {
  month: string;
  platform: 'facebook' | 'instagram';
  account_id: string;
  account_name: string;
  start_followers: number;
  end_followers: number;
  net_change: number;
  percent_change: number;
}

export interface DashboardStats {
  totalFollowers: number;
  totalReach: number;
  totalInteractions: number;
  totalPosts: number;
  fbFollowers: number;
  fbReactions: number;
  fbComments: number;
  fbReach: number;
  igFollowers: number;
  igLikes: number;
  igComments: number;
  igSaves: number;
  igReach: number;
}
