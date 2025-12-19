module.exports = {
  // Environment
  nodeEnv: process.env.NODE_ENV || 'production',
  
  // AI Configuration
  aiProvider: process.env.AI_PROVIDER || 'anthropic',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
  
  // Twitter Configuration
  twitter: {
    apiKey: process.env.TWITTER_API_KEY,
    apiSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  },
  
  // Reddit Configuration
  reddit: {
    clientId: process.env.REDDIT_CLIENT_ID,
    clientSecret: process.env.REDDIT_CLIENT_SECRET,
    username: process.env.REDDIT_USERNAME,
    password: process.env.REDDIT_PASSWORD,
    userAgent: process.env.REDDIT_USER_AGENT || 'AI-Auto-Post-Agent/1.0',
    subreddits: (process.env.REDDIT_SUBREDDITS || 'test').split(',').map(s => s.trim()),
  },
  
  // Blogger Configuration
  blogger: {
    blogId: process.env.BLOGGER_BLOG_ID,
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  
  // Application Settings
  postsPerRun: parseInt(process.env.POSTS_PER_RUN) || 3,
  scheduleTimes: (process.env.SCHEDULE_TIMES || '09:00,15:00,21:00').split(',').map(s => s.trim()),
  
  // Platform Toggles
  enableTwitter: process.env.ENABLE_TWITTER !== 'false',
  enableReddit: process.env.ENABLE_REDDIT !== 'false',
  enableBlogger: process.env.ENABLE_BLOGGER !== 'false',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Advanced Settings
  maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
  delayBetweenPosts: parseInt(process.env.DELAY_BETWEEN_POSTS) || 60,
  dryRun: process.env.DRY_RUN === 'true',
  
  // Paths
  paths: {
    contentPlan: './src/data/content-plan.json',
    postHistory: './src/data/post-history.json',
    logs: './logs',
  },
};
