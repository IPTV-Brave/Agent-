const { google } = require('googleapis');
const config = require('../config/config');
const logger = require('../utils/logger');

class BloggerService {
  constructor() {
    if (!config.blogger.blogId) {
      logger.warn('Blogger API credentials not configured');
      this.client = null;
      return;
    }

    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: config.blogger.clientEmail,
          private_key: config.blogger.privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/blogger'],
      });

      this.blogger = google.blogger({
        version: 'v3',
        auth: auth,
      });

      this.blogId = config.blogger.blogId;
    } catch (error) {
      logger.error('Failed to initialize Blogger client:', error);
      this.client = null;
    }
  }

  async post(content) {
    if (!this.blogger) {
      throw new Error('Blogger client not initialized');
    }

    try {
      const { title, content: body, labels = [] } = content;

      if (!title || !body) {
        throw new Error('Blogger post requires both title and content');
      }

      if (config.dryRun) {
        logger.platform('blogger', `[DRY RUN] Would post article: ${title}`);
        return {
          success: true,
          platform: 'blogger',
          title,
          dryRun: true,
        };
      }

      const response = await this.blogger.posts.insert({
        blogId: this.blogId,
        requestBody: {
          title: title,
          content: this.formatContent(body),
          labels: labels,
        },
      });

      logger.platform('blogger', `Posted article: ${title}`);

      return {
        success: true,
        platform: 'blogger',
        postId: response.data.id,
        url: response.data.url,
        title: response.data.title,
      };
    } catch (error) {
      logger.error('Blogger posting error:', error);
      throw error;
    }
  }

  formatContent(content) {
    // If content is already HTML, return as is
    if (content.includes('<p>') || content.includes('<div>')) {
      return content;
    }

    // Convert plain text to HTML with proper formatting
    const paragraphs = content.split('\n\n');
    const htmlContent = paragraphs
      .map(p => {
        if (p.trim().startsWith('#')) {
          // Convert markdown headers
          const level = p.match(/^#+/)[0].length;
          const text = p.replace(/^#+\s*/, '');
          return `<h${Math.min(level, 6)}>${text}</h${Math.min(level, 6)}>`;
        }
        return `<p>${p.replace(/\n/g, '<br>')}</p>`;
      })
      .join('\n');

    return htmlContent;
  }

  async verifyCredentials() {
    if (!this.blogger) {
      return { success: false, error: 'Client not initialized' };
    }

    try {
      const response = await this.blogger.blogs.get({
        blogId: this.blogId,
      });

      logger.success(`Blogger authenticated: ${response.data.name}`);
      return {
        success: true,
        blogName: response.data.name,
        url: response.data.url,
      };
    } catch (error) {
      logger.error('Blogger authentication failed:', error);
      return { success: false, error: error.message };
    }
  }

  async listPosts(maxResults = 10) {
    if (!this.blogger) {
      throw new Error('Blogger client not initialized');
    }

    try {
      const response = await this.blogger.posts.list({
        blogId: this.blogId,
        maxResults,
      });

      return response.data.items || [];
    } catch (error) {
      logger.error('Error listing posts:', error);
      throw error;
    }
  }

  isEnabled() {
    return config.enableBlogger && this.blogger !== null;
  }
}

module.exports = new BloggerService();
