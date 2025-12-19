const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const config = require('../config/config');
const logger = require('../utils/logger');

class AIGenerator {
  constructor() {
    if (config.aiProvider === 'anthropic') {
      this.client = new Anthropic({
        apiKey: config.anthropicApiKey,
      });
    } else if (config.aiProvider === 'openai') {
      this.client = new OpenAI({
        apiKey: config.openaiApiKey,
      });
    }
  }

  async generateContent(platform, idea, additionalContext = {}) {
    try {
      const prompt = this.buildPrompt(platform, idea, additionalContext);
      
      if (config.aiProvider === 'anthropic') {
        return await this.generateWithAnthropic(prompt);
      } else {
        return await this.generateWithOpenAI(prompt);
      }
    } catch (error) {
      logger.error(`AI generation error for ${platform}:`, error);
      throw error;
    }
  }

  buildPrompt(platform, idea, context) {
    const { 
      keywords = [], 
      tone = 'professional', 
      targetAudience = 'general',
      branding = null,
      includeBranding = false
    } = context;
    
    const platformSpecs = {
      twitter: {
        format: 'Twitter thread (2-3 tweets)',
        maxLength: '250 characters per tweet (STRICT LIMIT)',
        style: 'concise, engaging, with relevant hashtags',
      },
      reddit: {
        format: 'Reddit post with title and body',
        maxLength: 'Title: 300 chars, Body: 500-800 words',
        style: 'conversational, informative, community-friendly',
      },
      blogger: {
        format: 'Blog article',
        maxLength: '800-1200 words',
        style: 'well-structured with introduction, main points, and conclusion',
      },
    };

    const spec = platformSpecs[platform] || platformSpecs.twitter;

    let brandingInstructions = '';
    if (includeBranding && branding) {
      if (platform === 'twitter') {
        brandingInstructions = `\n\nCRITICAL TWITTER RULES:
- Each tweet MUST be MAXIMUM 250 characters (including branding)
- Add branding ONLY in the LAST tweet
- Branding format for last tweet:
"🌐 ${branding.name}: ${branding.website}
📱 WhatsApp: ${branding.whatsapp}"
- This branding is approximately 80 characters
- So main content in last tweet must be MAX 170 characters
- Count characters carefully - exceeding 250 will cause posting to FAIL
- Emojis count as 2 characters each`;
      } else if (platform === 'reddit') {
        brandingInstructions = `\n\nIMPORTANT: Add this section at the END of the post body:

---
**Learn More:**
- 🌐 Website: [${branding.name}](${branding.website})
- 📱 WhatsApp: ${branding.whatsapp}`;
      } else if (platform === 'blogger') {
        brandingInstructions = `\n\nIMPORTANT: Add this HTML section at the END of the article:

<div style="border-top: 2px solid #ddd; margin-top: 30px; padding-top: 20px;">
<h3>Learn More About ${branding.name}</h3>
<p>🌐 Visit our website: <a href="${branding.website}" target="_blank">${branding.website}</a></p>
<p>📱 Contact us on WhatsApp: <a href="${branding.whatsapp}" target="_blank">Click here</a></p>
</div>`;
      }
    }

    return `Create ${spec.format} about: "${idea}"

Requirements:
- Target Audience: ${targetAudience}
- Tone: ${tone}
- Style: ${spec.style}
- Length: ${spec.maxLength}
${keywords.length > 0 ? `- Include these keywords naturally: ${keywords.join(', ')}` : ''}

${platform === 'twitter' ? `
Format as a JSON array of tweets:
{
  "tweets": [
    {"text": "Tweet 1 content here..."},
    {"text": "Tweet 2 content here..."}
  ]
}
` : ''}

${platform === 'reddit' ? `
Format as JSON:
{
  "title": "Engaging title here",
  "body": "Main content here..."
}
` : ''}

${platform === 'blogger' ? `
Format as JSON:
{
  "title": "Article title",
  "content": "Full HTML content with proper formatting"
}
` : ''}

Make it authentic, valuable, and engaging. Avoid promotional language.`;
  }

  async generateWithAnthropic(prompt) {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return this.parseResponse(response.content[0].text);
  }

  async generateWithOpenAI(prompt) {
    const response = await this.client.chat.completions.create({
      model: config.openaiModel,
      messages: [
        {
          role: 'system',
          content: 'You are a professional content creator specializing in social media and blog content.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    return this.parseResponse(response.choices[0].message.content);
  }

  parseResponse(text) {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || 
                       text.match(/```\n?([\s\S]*?)\n?```/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // Try parsing the entire response as JSON
      return JSON.parse(text);
    } catch (error) {
      logger.error('Failed to parse AI response as JSON:', error);
      // Return raw text as fallback
      return { text };
    }
  }

  async generateVariation(originalContent, platform) {
    const prompt = `Rewrite the following ${platform} content with a fresh perspective while keeping the core message:

Original: ${JSON.stringify(originalContent)}

Create a completely different version (different wording, structure, examples) but same topic.
Return in the same JSON format.`;

    try {
      if (config.aiProvider === 'anthropic') {
        return await this.generateWithAnthropic(prompt);
      } else {
        return await this.generateWithOpenAI(prompt);
      }
    } catch (error) {
      logger.error('Error generating variation:', error);
      throw error;
    }
  }
}

module.exports = new AIGenerator();
