require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const config = require('../config/config');
const logger = require('../utils/logger');

async function showStats() {
  try {
    const historyPath = path.join(process.cwd(), config.paths.postHistory);
    const data = await fs.readFile(historyPath, 'utf8');
    const history = JSON.parse(data);

    console.log('\n' + '='.repeat(60));
    console.log('📊 AI AUTO POST AGENT - STATISTICS');
    console.log('='.repeat(60) + '\n');

    // Overall stats
    const totalPosts = history.posts.length;
    console.log(`Total Posts: ${totalPosts}`);
    console.log(`Last Updated: ${new Date(history.lastUpdated).toLocaleString()}\n`);

    if (totalPosts === 0) {
      console.log('No posts have been created yet.\n');
      return;
    }

    // Platform breakdown
    const platformStats = {};
    let successCount = 0;
    let failureCount = 0;

    history.posts.forEach(post => {
      post.results.forEach(result => {
        if (!platformStats[result.platform]) {
          platformStats[result.platform] = { success: 0, failure: 0 };
        }
        
        if (result.success) {
          platformStats[result.platform].success++;
          successCount++;
        } else {
          platformStats[result.platform].failure++;
          failureCount++;
        }
      });
    });

    console.log('Platform Breakdown:');
    console.log('-'.repeat(60));
    Object.keys(platformStats).forEach(platform => {
      const stats = platformStats[platform];
      const total = stats.success + stats.failure;
      const successRate = ((stats.success / total) * 100).toFixed(1);
      
      console.log(`${platform.toUpperCase()}:`);
      console.log(`  ✓ Successful: ${stats.success}`);
      console.log(`  ✗ Failed: ${stats.failure}`);
      console.log(`  Success Rate: ${successRate}%`);
      console.log('');
    });

    // Success rate
    const totalAttempts = successCount + failureCount;
    const overallSuccessRate = ((successCount / totalAttempts) * 100).toFixed(1);
    
    console.log('Overall Performance:');
    console.log('-'.repeat(60));
    console.log(`Total Attempts: ${totalAttempts}`);
    console.log(`✓ Successful: ${successCount}`);
    console.log(`✗ Failed: ${failureCount}`);
    console.log(`Success Rate: ${overallSuccessRate}%\n`);

    // Recent activity
    console.log('Recent Posts (Last 5):');
    console.log('-'.repeat(60));
    const recentPosts = history.posts.slice(-5).reverse();
    
    recentPosts.forEach((post, index) => {
      const date = new Date(post.timestamp).toLocaleString();
      const platforms = post.results.map(r => r.platform).join(', ');
      const status = post.results.every(r => r.success) ? '✓' : '✗';
      
      console.log(`${index + 1}. ${status} ${date}`);
      console.log(`   Idea: ${post.idea}`);
      console.log(`   Platforms: ${platforms}`);
      console.log('');
    });

    // Ideas used
    const ideasUsed = new Set(history.posts.map(p => p.ideaId));
    console.log(`Content Ideas Used: ${ideasUsed.size}\n`);

    console.log('='.repeat(60) + '\n');
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.error('Post history file not found. No posts have been created yet.');
    } else {
      logger.error('Error reading stats:', error);
    }
  }
}

showStats();
