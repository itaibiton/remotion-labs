// Render limits for abuse prevention (single clip)
export const RENDER_LIMITS = {
  // Rate limiting
  RENDERS_PER_HOUR: 5,
  RATE_WINDOW_MS: 60 * 60 * 1000, // 1 hour

  // Quality caps
  MAX_RESOLUTION_WIDTH: 1920,
  MAX_RESOLUTION_HEIGHT: 1080,
  MAX_DURATION_SECONDS: 20,
  MAX_DURATION_FRAMES: 20 * 30, // 600 frames at 30fps

  // Timeouts
  LAMBDA_TIMEOUT_MS: 60000, // 1 minute
  POLL_INTERVAL_MS: 2000, // 2 seconds
} as const;

// Movie render limits (higher caps for multi-scene videos)
export const MOVIE_RENDER_LIMITS = {
  MAX_DURATION_SECONDS: 120,
  MAX_DURATION_FRAMES: 120 * 30, // 3600 frames at 30fps
  LAMBDA_TIMEOUT_MS: 240000, // 4 minutes
  POLL_INTERVAL_MS: 3000, // 3 seconds (slightly longer for movies)
  MAX_SCENES: 20, // Scene count limit
} as const;
