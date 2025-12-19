require('dotenv').config();
const cron = require('node-cron');
const logger = require('./utils/logger');
const scheduler = require('./utils/scheduler');
const config = require('./config/config');

async function main() {
  logger.info('🚀 AI Auto Post Agent Starting...');
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Scheduled times: ${config.scheduleTimes.join(', ')}`);

  // Validate configuration
  if (!validateConfig()) {
    logger.error('❌ Configuration validation failed. Please check your .env file.');
    process.exit(1);
  }

  // Setup scheduled jobs
  scheduler.setupScheduledJobs();

  logger.info('✅ Agent is running. Press Ctrl+C to stop.');
  logger.info(`Platforms enabled: ${getEnabledPlatforms().join(', ')}`);

  // Run immediately on start if in development mode
  if (config.nodeEnv === 'development') {
    logger.info('🔧 Development mode: Running initial post cycle...');
    setTimeout(() => {
      scheduler.runPostCycle().catch(err => {
        logger.error('Error in initial post cycle:', err);
      });
    }, 2000);
  }
}

function validateConfig() {
  const required = ['AI_PROVIDER'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    return false;
  }

  // Validate AI provider
  if (config.aiProvider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
    logger.error('ANTHROPIC_API_KEY is required when AI_PROVIDER is anthropic');
    return false;
  }

  if (config.aiProvider === 'openai' && !process.env.OPENAI_API_KEY) {
    logger.error('OPENAI_API_KEY is required when AI_PROVIDER is openai');
    return false;
  }

  // Check if at least one platform is enabled
  if (!config.enableTwitter && !config.enableReddit && !config.enableBlogger) {
    logger.error('At least one platform must be enabled');
    return false;
  }

  return true;
}

function getEnabledPlatforms() {
  const platforms = [];
  if (config.enableTwitter) platforms.push('Twitter');
  if (config.enableReddit) platforms.push('Reddit');
  if (config.enableBlogger) platforms.push('Blogger');
  return platforms;
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the application
main().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
