require('dotenv').config();
const logger = require('../utils/logger');
const twitterService = require('../services/twitter-service');
const redditService = require('../services/reddit-service');
const bloggerService = require('../services/blogger-service');

async function verifyAllCredentials() {
  logger.info('🔐 Verifying API credentials...\n');

  const results = {
    twitter: { enabled: false, verified: false },
    reddit: { enabled: false, verified: false },
    blogger: { enabled: false, verified: false },
  };

  // Twitter
  if (twitterService.isEnabled()) {
    results.twitter.enabled = true;
    logger.info('Testing Twitter...');
    const twitterResult = await twitterService.verifyCredentials();
    results.twitter.verified = twitterResult.success;
    if (twitterResult.success) {
      logger.success(`✓ Twitter: Authenticated as @${twitterResult.username}`);
    } else {
      logger.error(`✗ Twitter: ${twitterResult.error}`);
    }
  } else {
    logger.warn('⊘ Twitter: Disabled or not configured');
  }

  console.log('');

  // Reddit
  if (redditService.isEnabled()) {
    results.reddit.enabled = true;
    logger.info('Testing Reddit...');
    const redditResult = await redditService.verifyCredentials();
    results.reddit.verified = redditResult.success;
    if (redditResult.success) {
      logger.success(`✓ Reddit: Authenticated as u/${redditResult.username} (${redditResult.karma} karma)`);
    } else {
      logger.error(`✗ Reddit: ${redditResult.error}`);
    }
  } else {
    logger.warn('⊘ Reddit: Disabled or not configured');
  }

  console.log('');

  // Blogger
  if (bloggerService.isEnabled()) {
    results.blogger.enabled = true;
    logger.info('Testing Blogger...');
    const bloggerResult = await bloggerService.verifyCredentials();
    results.blogger.verified = bloggerResult.success;
    if (bloggerResult.success) {
      logger.success(`✓ Blogger: Authenticated - ${bloggerResult.blogName}`);
      logger.info(`  URL: ${bloggerResult.url}`);
    } else {
      logger.error(`✗ Blogger: ${bloggerResult.error}`);
    }
  } else {
    logger.warn('⊘ Blogger: Disabled or not configured');
  }

  console.log('\n' + '='.repeat(50));
  console.log('Summary:');
  console.log('='.repeat(50));

  const platforms = Object.keys(results);
  const enabledCount = platforms.filter(p => results[p].enabled).length;
  const verifiedCount = platforms.filter(p => results[p].verified).length;

  console.log(`Enabled platforms: ${enabledCount}/${platforms.length}`);
  console.log(`Verified platforms: ${verifiedCount}/${enabledCount}`);

  if (verifiedCount === 0) {
    logger.error('\n❌ No platforms are properly configured!');
    logger.info('Please check your .env file and API credentials.');
    process.exit(1);
  } else if (verifiedCount < enabledCount) {
    logger.warn(`\n⚠️  ${enabledCount - verifiedCount} platform(s) failed verification.`);
    process.exit(1);
  } else {
    logger.success('\n✅ All enabled platforms verified successfully!');
  }
}

verifyAllCredentials().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
