const snoowrap = require('snoowrap');
const config = require('../config/config');
const logger = require('../utils/logger');

class RedditService {
  constructor() {
    if (!config.reddit.clientId) {
      logger.warn('Reddit API credentials not configured');
      this.client = null;
      return;
    }

    try {
      this.client = new snoowrap({
        userAgent: config.reddit.userAgent,
        clientId: config.reddit.clientId,
        clientSecret: config.reddit.clientSecret,
        username: config.reddit.username,
        password: config.reddit.password,
      });

      // Configure to handle rate limiting
      this.client.config({ requestDelay: 1000, continueAfterRatelimitError: true });
    } catch (error) {
      logger.error('Failed to initialize Reddit client:', error);
      this.client = null;
    }
  }

  async post(content, subreddit = null) {
    if (!this.client) {
      throw new Error('Reddit client not initialized');
    }

    try {
      const targetSubreddit = subreddit || this.selectRandomSubreddit();
      const { title, body } = content;

      if (!title || !body) {
        throw new Error('Reddit post requires both title and body');
      }

      if (config.dryRun) {
        logger.platform('reddit', `[DRY RUN] Would post to r/${targetSubreddit}: ${title}`);
        return {
          success: true,
          platform: 'reddit',
          subreddit: targetSubreddit,
          url: `https://reddit.com/r/${targetSubreddit}/`,
          dryRun: true,
        };
      }

      const submission = await this.client.getSubreddit(targetSubreddit).submitSelfpost({
        title: title,
        text: body,
      });

      logger.platform('reddit', `Posted to r/${targetSubreddit}: ${title}`);

      return {
        success: true,
        platform: 'reddit',
        subreddit: targetSubreddit,
        postId: submission.id,
        url: `https://reddit.com${submission.permalink}`,
      };
    } catch (error) {
      logger.error('Reddit posting error:', error);
      
      // Handle specific Reddit errors
      if (error.message.includes('RATELIMIT')) {
        logger.warn('Reddit rate limit hit, will retry later');
      } else if (error.message.includes('SUBREDDIT_NOEXIST')) {
        logger.error(`Subreddit does not exist: ${subreddit}`);
      }
      
      throw error;
    }
  }

  selectRandomSubreddit() {
    const subreddits = config.reddit.subreddits;
    return subreddits[Math.floor(Math.random() * subreddits.length)];
  }

  async verifyCredentials() {
    if (!this.client) {
      return { success: false, error: 'Client not initialized' };
    }

    try {
      const user = await this.client.getMe();
      logger.success(`Reddit authenticated as: u/${user.name}`);
      return { success: true, username: user.name, karma: user.link_karma + user.comment_karma };
    } catch (error) {
      logger.error('Reddit authentication failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getSubredditInfo(subreddit) {
    if (!this.client) {
      throw new Error('Reddit client not initialized');
    }

    try {
      const sub = await this.client.getSubreddit(subreddit).fetch();
      return {
        name: sub.display_name,
        subscribers: sub.subscribers,
        description: sub.public_description,
      };
    } catch (error) {
      logger.error(`Error fetching subreddit info for r/${subreddit}:`, error);
      throw error;
    }
  }

  isEnabled() {
    return config.enableReddit && this.client !== null;
  }
}

module.exports = new RedditService();
