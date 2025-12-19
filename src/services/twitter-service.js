const { TwitterApi } = require('twitter-api-v2');
const config = require('../config/config');
const logger = require('../utils/logger');

class TwitterService {
  constructor() {
    if (!config.twitter.apiKey) {
      logger.warn('Twitter API credentials not configured');
      this.client = null;
      return;
    }

    try {
      this.client = new TwitterApi({
        appKey: config.twitter.apiKey,
        appSecret: config.twitter.apiSecret,
        accessToken: config.twitter.accessToken,
        accessSecret: config.twitter.accessSecret,
      });
      
      this.rwClient = this.client.readWrite;
    } catch (error) {
      logger.error('Failed to initialize Twitter client:', error);
      this.client = null;
    }
  }

  async post(content) {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }

    try {
      const tweets = content.tweets || [{ text: content.text }];
      const results = [];
      let lastTweetId = null;

      for (let i = 0; i < tweets.length; i++) {
        const tweet = tweets[i];
        
        // Validate tweet length (max 250 characters)
        const tweetText = tweet.text.trim();
        if (tweetText.length > 250) {
          logger.error(`Tweet ${i + 1} exceeds 250 characters (${tweetText.length} chars). Truncating...`);
          tweet.text = this.formatTweet(tweetText, 250);
        }

        if (config.dryRun) {
          logger.platform('twitter', `[DRY RUN] Would post (${tweet.text.length} chars): ${tweet.text}`);
          results.push({ id: 'dry-run-' + Date.now(), text: tweet.text });
          await this.delay(2000);
          continue;
        }

        const options = {};
        
        // If this is part of a thread, reply to the previous tweet
        if (lastTweetId) {
          options.reply = { in_reply_to_tweet_id: lastTweetId };
        }

        const result = await this.rwClient.v2.tweet(tweet.text, options);
        
        lastTweetId = result.data.id;
        results.push(result.data);
        
        logger.platform('twitter', `Posted tweet ${i + 1}/${tweets.length} (${tweet.text.length} chars): ${tweet.text.substring(0, 50)}...`);
        
        // Wait between tweets in a thread
        if (tweets.length > 1 && i < tweets.length - 1) {
          await this.delay(3000);
        }
      }

      return {
        success: true,
        platform: 'twitter',
        results,
        count: results.length,
      };
    } catch (error) {
      logger.error('Twitter posting error:', error);
      throw error;
    }
  }

  async verifyCredentials() {
    if (!this.client) {
      return { success: false, error: 'Client not initialized' };
    }

    try {
      const user = await this.rwClient.v2.me();
      logger.success(`Twitter authenticated as: @${user.data.username}`);
      return { success: true, username: user.data.username };
    } catch (error) {
      logger.error('Twitter authentication failed:', error);
      return { success: false, error: error.message };
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  formatTweet(text, maxLength = 250) {
    if (text.length <= maxLength) {
      return text;
    }

    // Truncate and add ellipsis
    return text.substring(0, maxLength - 3) + '...';
  }

  isEnabled() {
    return config.enableTwitter && this.client !== null;
  }
}

module.exports = new TwitterService();
