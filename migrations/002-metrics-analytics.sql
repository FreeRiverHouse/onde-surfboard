-- Metrics Analytics: D1 tables for historical metrics tracking
-- Run with: wrangler d1 execute onde-surf-db --remote --file=migrations/002-metrics-analytics.sql

-- Drop old metrics table (wrong schema, 0 rows)
DROP TABLE IF EXISTS metrics;

-- Metrics table - stores historical metric values
CREATE TABLE IF NOT EXISTS metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_key TEXT NOT NULL,
  metric_value REAL NOT NULL,
  metric_date TEXT NOT NULL,
  source TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(metric_key, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_metrics_key ON metrics(metric_key);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_metrics_key_date ON metrics(metric_key, metric_date);

-- Metric definitions - describes each metric
CREATE TABLE IF NOT EXISTS metric_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT,
  description TEXT,
  is_cumulative INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed default metric definitions
INSERT OR IGNORE INTO metric_definitions (metric_key, display_name, category, unit, description, is_cumulative) VALUES
  ('books_published', 'Books Published', 'publishing', NULL, 'Total books published', 1),
  ('audiobooks_published', 'Audiobooks Published', 'publishing', NULL, 'Total audiobooks published', 1),
  ('podcasts_published', 'Podcasts Published', 'publishing', NULL, 'Total podcast episodes', 1),
  ('videos_published', 'Videos Published', 'publishing', NULL, 'Total videos published', 1),
  ('x_followers', 'X Followers', 'social', NULL, 'Twitter/X follower count', 0),
  ('ig_followers', 'Instagram Followers', 'social', NULL, 'Instagram follower count', 0),
  ('tiktok_followers', 'TikTok Followers', 'social', NULL, 'TikTok follower count', 0),
  ('youtube_subscribers', 'YouTube Subscribers', 'social', NULL, 'YouTube subscriber count', 0),
  ('posts_published', 'Posts This Week', 'social', NULL, 'Social posts this week', 0),
  ('ga_pageviews', 'Page Views', 'analytics', NULL, 'Google Analytics pageviews', 0),
  ('ga_users', 'Unique Users', 'analytics', NULL, 'Google Analytics unique users', 0),
  ('ga_sessions', 'Sessions', 'analytics', NULL, 'Google Analytics sessions', 0),
  ('ga_bounce_rate', 'Bounce Rate', 'analytics', '%', 'Google Analytics bounce rate', 0),
  ('gsc_clicks', 'Search Clicks', 'search', NULL, 'Google Search Console clicks', 0),
  ('gsc_impressions', 'Search Impressions', 'search', NULL, 'Google Search Console impressions', 0),
  ('gsc_ctr', 'Search CTR', 'search', '%', 'Google Search Console click-through rate', 0),
  ('gsc_avg_position', 'Average Position', 'search', NULL, 'Google Search Console average position', 0);
