export interface FBPage {
  page_id: string;
  name: string;
  created_at: Date;
}

export interface FBPost {
  post_id: string;
  page_id: string;
  created_time: Date;
  type: string;
  permalink: string;
  message: string | null;
  created_at: Date;
}

export interface FBPostMetrics {
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
  raw_json: Record<string, unknown>;
}

export interface FBPostWithMetrics extends FBPost {
  reactions_total: number;
  comments_total: number;
  shares_total: number | null;
  reach: number | null;
  impressions: number | null;
  interactions: number;
}

export interface FBKPIs {
  total_posts: number;
  total_reactions: number;
  total_comments: number;
  total_interactions: number;
  total_reach: number | null;
  total_impressions: number | null;
  avg_reach_per_post: number | null;
  avg_interactions_per_post: number;
}

export interface IGAccount {
  account_id: string;
  username: string;
  name: string | null;
  followers_count: number | null;
  created_at: Date;
}

export interface IGPost {
  media_id: string;
  account_id: string;
  media_type: string;
  caption: string | null;
  permalink: string;
  timestamp: Date;
  created_at: Date;
}

export interface IGPostMetrics {
  id: number;
  media_id: string;
  snapshot_time: Date;
  likes: number;
  comments: number;
  saves: number | null;
  reach: number | null;
  impressions: number | null;
  plays: number | null;
  shares: number | null;
  raw_json: Record<string, unknown>;
}

export interface IGPostWithMetrics extends IGPost {
  likes: number;
  comments: number;
  saves: number | null;
  reach: number | null;
  plays: number | null;
  interactions: number;
}

export interface IGKPIs {
  total_posts: number;
  total_likes: number;
  total_comments: number;
  total_interactions: number;
  total_saves: number | null;
  total_reach: number | null;
  total_plays: number | null;
  avg_reach_per_post: number | null;
  avg_interactions_per_post: number;
}
