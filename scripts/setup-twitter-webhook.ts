import { setupWebhook, TwitterClientError } from '../src/app/lib/twitter';
import { config } from 'dotenv';

// Load environment variables
config();

async function validateEnvironment() {
  const requiredVars = [
    'TWITTER_API_KEY',
    'TWITTER_API_SECRET',
    'TWITTER_ACCESS_TOKEN',
    'TWITTER_ACCESS_SECRET',
    'WEBHOOK_URL',
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  const webhookUrl = process.env.WEBHOOK_URL!;
  try {
    new URL(webhookUrl);
  } catch {
    throw new Error('WEBHOOK_URL must be a valid URL');
  }

  if (!webhookUrl.startsWith('https://')) {
    throw new Error('WEBHOOK_URL must use HTTPS');
  }
}

async function main() {
  try {
    await validateEnvironment();

    const webhookUrl = process.env.WEBHOOK_URL!;
    console.log('Setting up Twitter webhook...');
    console.log(`Webhook URL: ${webhookUrl}`);

    const webhook = await setupWebhook(webhookUrl);
    console.log('Webhook created successfully:', webhook);
  } catch (error) {
    if (error instanceof TwitterClientError) {
      console.error('Twitter API Error:', error.error);
    } else {
      console.error('Error:', (error as Error).message);
    }
    process.exit(1);
  }
}

main(); 