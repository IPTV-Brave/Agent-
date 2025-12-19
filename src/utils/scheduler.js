const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config/config');
const logger = require('./logger');
const aiGenerator = require('../services/ai-generator');
const twitterService = require('../services/twitter-service');
const redditService = require('../services/reddit-service');
const bloggerService = require('../services/blogger-service');

class Scheduler {
  constructor() {
    this.contentPlan = null;
    this.postHistory = null;
    this.currentIndex = 0;
  }

  async loadData() {
    try {
      // Load content plan
      const planPath = path.join(process.cwd(), config.paths.contentPlan);
      const planData = await fs.readFile(planPath, 'utf8');
      this.contentPlan = JSON.parse(planData);

      // Load or create post history
      const historyPath = path.join(process.cwd(), config.paths.postHistory);
      try {
        const historyData = await fs.readFile(historyPath, 'utf8');
        this.postHistory = JSON.parse(historyData);
      } catch (error) {
        // Create new history file if it doesn't exist
        this.postHistory = { posts: [], lastUpdated: new Date().toISOString() };
        await this.saveHistory();
      }

      logger.info(`Loaded ${this.contentPlan.contentPlan.length} content ideas`);
      logger.info(`Post history: ${this.postHistory.posts.length} entries`);
    } catch (error) {
      logger.error('Error loading data:', error);
      throw error;
    }
  }

  async saveHistory() {
    try {
      const historyPath = path.join(process.cwd(), config.paths.postHistory);
      this.postHistory.lastUpdated = new Date().toISOString();
      await fs.writeFile(historyPath, JSON.stringify(this.postHistory, null, 2));
    } catch (error) {
      logger.error('Error saving history:', error);
    }
  }

  setupScheduledJobs() {
    logger.info('Setting up scheduled jobs...');

    // Convert schedule times to cron expressions
    config.scheduleTimes.forEach((time, index) => {
      const [hour, minute] = time.split(':');
      const cronExpression = `${minute} ${hour} * * *`;

      cron.schedule(cronExpression, async () => {
        logger.info(`⏰ Scheduled job triggered at ${time}`);
        await this.runPostCycle();
      });

      logger.info(`✓ Job ${index + 1} scheduled for ${time} (cron: ${cronExpression})`);
    });
  }

  async runPostCycle() {
    try {
      await this.loadData();

      logger.info(`📝 Starting post cycle - Will create ${config.postsPerRun} posts`);

      const postsToCreate = Math.min(config.postsPerRun, this.contentPlan.contentPlan.length);

      for (let i = 0; i < postsToCreate; i++) {
        await this.createAndPostContent();
        
        // Delay between posts
        if (i < postsToCreate - 1) {
          logger.info(`⏳ Waiting ${config.delayBetweenPosts} seconds before next post...`);
          await this.delay(config.delayBetweenPosts * 1000);
        }
      }

      logger.success(`✅ Post cycle completed. Created ${postsToCreate} posts`);
    } catch (error) {
      logger.error('Error in post cycle:', error);
    }
  }

  async createAndPostContent() {
    try {
      // Get next content idea
      const idea = this.getNextIdea();
      if (!idea) {
        logger.warn('No more content ideas available');
        return;
      }

      logger.info(`📌 Processing idea #${idea.id}: "${idea.idea}"`);

      const results = [];

      // Post to each enabled platform
      for (const platform of idea.platforms) {
        if (this.isPlatformEnabled(platform)) {
          try {
            const result = await this.postToPlatform(platform, idea);
            results.push(result);
          } catch (error) {
            logger.error(`Failed to post to ${platform}:`, error.message);
            results.push({
              platform,
              success: false,
              error: error.message,
            });
          }
        }
      }

      // Save to history
      this.postHistory.posts.push({
        ideaId: idea.id,
        idea: idea.idea,
        timestamp: new Date().toISOString(),
        results,
      });

      await this.saveHistory();
    } catch (error) {
      logger.error('Error creating content:', error);
    }
  }

  async postToPlatform(platform, idea) {
    logger.info(`🎯 Generating content for ${platform}...`);

    // Prepare context with branding info
    const context = {
      keywords: idea.keywords,
      tone: idea.tone,
      targetAudience: idea.targetAudience,
      includeBranding: idea.includeBranding || false,
      branding: this.contentPlan.branding || null,
    };

    // Generate content using AI
    const content = await aiGenerator.generateContent(platform, idea.idea, context);

    logger.info(`✓ Content generated for ${platform}`);

    // Post to platform
    let result;
    switch (platform) {
      case 'twitter':
        result = await twitterService.post(content);
        break;
      case 'reddit':
        result = await redditService.post(content);
        break;
      case 'blogger':
        result = await bloggerService.post(content);
        break;
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }

    logger.success(`Posted to ${platform} successfully`);
    return result;
  }

  getNextIdea() {
    const settings = this.contentPlan.settings || {};
    const ideas = this.contentPlan.contentPlan;

    if (ideas.length === 0) return null;

    // Sequential rotation
    if (settings.rotationStrategy === 'sequential') {
      const idea = ideas[this.currentIndex % ideas.length];
      this.currentIndex++;
      return idea;
    }

    // Random selection
    return ideas[Math.floor(Math.random() * ideas.length)];
  }

  isPlatformEnabled(platform) {
    switch (platform) {
      case 'twitter':
        return twitterService.isEnabled();
      case 'reddit':
        return redditService.isEnabled();
      case 'blogger':
        return bloggerService.isEnabled();
      default:
        return false;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new Scheduler();
