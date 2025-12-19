require('dotenv').config();
const logger = require('./utils/logger');
const scheduler = require('./utils/scheduler');

async function testPost() {
  logger.info('🧪 Running test post...');
  
  try {
    // Load data
    await scheduler.loadData();
    
    // Create and post one piece of content
    await scheduler.createAndPostContent();
    
    logger.success('✅ Test post completed successfully!');
  } catch (error) {
    logger.error('❌ Test post failed:', error);
    process.exit(1);
  }
}

testPost();
